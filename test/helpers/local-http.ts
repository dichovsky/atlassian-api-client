import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import { duplexPair, type Duplex } from 'node:stream';
import type { Agent, Dispatcher } from 'undici';

interface Endpoint {
  readonly server: Server;
  readonly inProcess?: { peers: Set<Duplex>; agent?: Agent };
}

// Node initializes its fetch implementation lazily. Let it install its bundled
// dispatcher before importing npm undici, which otherwise installs its own Agent.
void globalThis.Request;
const undici = await import('undici');
let nextVirtualHost = 1;

/** A private group of HTTP fixtures. Each server has a distinct localhost origin. */
export class LocalHttpNetwork {
  private readonly endpoints = new Map<string, Endpoint>();

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
    this.endpoints.set(origin, { server, inProcess: { peers: new Set() } });
    return origin;
  }

  private readonly dispatcher: Pick<Dispatcher, 'dispatch'> = {
    dispatch: (options, handler) => {
      // Check every hop, including redirects followed internally by native fetch.
      const origin = String(options.origin);
      const endpoint = this.endpoints.get(origin);
      if (!endpoint) {
        throw Object.assign(new Error(`Connection refused: ${origin}`), { code: 'ECONNREFUSED' });
      }
      const { headersTimeout } = this.options;
      if (headersTimeout !== undefined) options = { ...options, headersTimeout };
      if (!endpoint.inProcess) return undici.getGlobalDispatcher().dispatch(options, handler);

      const { peers } = endpoint.inProcess;
      endpoint.inProcess.agent ??= new undici.Agent({
        connect: (_options, callback) => {
          const [client, peer] = duplexPair({ allowHalfOpen: false });
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
      return endpoint.inProcess.agent.dispatch(options, handler);
    },
  };

  readonly fetch: typeof fetch = (input, init) =>
    globalThis.fetch(input, { ...init, dispatcher: this.dispatcher } as RequestInit);

  async close(server: Server): Promise<void> {
    const entry = [...this.endpoints].find(([, endpoint]) => endpoint.server === server);
    if (!entry) return;
    const [origin, { inProcess }] = entry;
    this.endpoints.delete(origin);
    if (inProcess) {
      for (const peer of inProcess.peers) peer.destroy();
      await inProcess.agent?.destroy();
    } else {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
        server.closeAllConnections();
      });
    }
  }
}
