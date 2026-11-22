import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import { duplexPair, type Duplex } from 'node:stream';
import { Agent, buildConnector } from 'undici';

interface Endpoint {
  readonly server: Server;
  // Only the in-process transport needs to track connections itself.
  readonly peers?: Set<Duplex>;
}

const connectTcp = buildConnector({});
let nextVirtualHost = 1;

/** A private group of HTTP fixtures. Each server has a distinct localhost origin. */
export class LocalHttpNetwork {
  private readonly endpoints = new Map<string, Endpoint>();
  private agent?: Agent;

  constructor(private readonly options: { headersTimeout?: number; inProcess?: boolean } = {}) {}

  async listen(server: Server): Promise<string> {
    if (!this.options.inProcess) {
      try {
        const ready = once(server, 'listening');
        server.listen(0, '127.0.0.1');
        await ready;
        const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        this.endpoints.set(origin, { server });
        return origin;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (process.env['GITHUB_ACTIONS'] === 'true' || (code !== 'EPERM' && code !== 'EACCES')) {
          throw error;
        }
      }
    }

    // A restricted runner can still exercise the native HTTP parser, fetch,
    // streaming, redirects and timeouts over two directly connected streams.
    const origin = `http://fixture-${nextVirtualHost++}.localhost`;
    this.endpoints.set(origin, { server, peers: new Set() });
    return origin;
  }

  readonly fetch: typeof fetch = (input, init) => {
    this.agent ??= new Agent({
      headersTimeout: this.options.headersTimeout,
      connect: (options, callback) => {
        const origin = `${options.protocol}//${options.host}`;
        // Restrict every connection, including redirects followed by native fetch.
        const endpoint = this.endpoints.get(origin);
        if (!endpoint) {
          const error = Object.assign(new Error(`Connection refused: ${origin}`), {
            code: 'ECONNREFUSED',
          });
          queueMicrotask(() => callback(error, null));
          return;
        }
        if (!endpoint.peers) {
          connectTcp(options, callback);
          return;
        }
        const [client, peer] = duplexPair({ allowHalfOpen: false });
        const { peers } = endpoint;
        peers.add(peer);
        // Early Node 24 releases do not propagate destruction to the other end.
        client.once('close', () => peer.destroy());
        peer.once('close', () => {
          peers.delete(peer);
          client.destroy();
        });
        endpoint.server.emit('connection', peer);
        // Undici expects an asynchronous connector and uses the duplex stream
        // interface for HTTP/1.1. Its connector declaration requires a Socket.
        queueMicrotask(() => callback(null, client as Socket));
      },
    });
    const agent = this.agent;
    const response = globalThis.fetch(input, { ...init, dispatcher: agent } as RequestInit);
    if (this.endpoints.size > 0) return response;
    this.agent = undefined;
    return response.finally(() => agent.destroy());
  };

  async close(server: Server): Promise<void> {
    const entry = [...this.endpoints].find(([, endpoint]) => endpoint.server === server);
    if (!entry) return;
    const [origin, { peers }] = entry;
    this.endpoints.delete(origin);
    const dispatcher = this.endpoints.size === 0 ? this.agent : undefined;
    if (dispatcher) this.agent = undefined;
    try {
      if (peers) {
        for (const peer of peers) peer.destroy();
      } else {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
          server.closeAllConnections();
        });
      }
    } finally {
      await dispatcher?.destroy();
    }
  }
}
