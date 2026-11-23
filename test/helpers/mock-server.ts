/**
 * Local HTTP server for integration tests of HttpTransport.
 *
 * The fixture gives each server its own loopback origin. The base URL
 * is available after `start()` resolves.
 *
 * Usage:
 * ```ts
 * const server = new MockServer();
 * await server.start();
 *
 * server.setHandler('/path', { status: 200, body: { ok: true } });
 * // ... make request ...
 * const [req] = server.requests;
 *
 * await server.close();
 * ```
 */

import * as http from 'node:http';
import { LocalHttpNetwork } from './local-http.js';

export interface MockResponse {
  /** HTTP status code. Default: 200. */
  readonly status?: number;
  /** Response headers to include. */
  readonly headers?: Record<string, string>;
  /**
   * Response body. A plain object/array is JSON-serialised and the
   * Content-Type header is set to `application/json`. A string is sent as-is.
   * Omit for empty body (e.g. 204).
   */
  readonly body?: unknown;
  /**
   * Artificial delay in milliseconds before sending the response. Useful for
   * timeout and retry tests. Default: 0.
   */
  readonly delayMs?: number;
}

export interface CapturedRequest {
  readonly method: string;
  readonly path: string;
  /** Raw parsed query string (URL fragment after `?`). */
  readonly query: string;
  /** All request headers in lower-cased keys. */
  readonly headers: Record<string, string>;
  /** Decoded request body text (empty string when no body). */
  readonly body: string;
}

type Handler = (req: CapturedRequest) => MockResponse | Promise<MockResponse>;

/**
 * Minimal in-process HTTP server for transport integration tests.
 *
 * Per-path handlers take priority over the default handler. The path is
 * matched against the URL path component (query string excluded).
 */
export class MockServer {
  private readonly server: http.Server;
  private _baseUrl = '';
  private _requests: CapturedRequest[] = [];
  private readonly handlers: Map<string, Handler> = new Map<string, Handler>();
  private defaultHandler: Handler = () => ({ status: 200, body: {} });

  constructor(private readonly network = new LocalHttpNetwork()) {
    this.server = http.createServer((req, res) => {
      void this.handleRequest(req, res);
    });
  }

  /** Resolved base URL (e.g. `http://127.0.0.1:PORT`). Available after `start()`. */
  get baseUrl(): string {
    return this._baseUrl;
  }

  /** True while this fixture owns an operating-system TCP listener. */
  get hasTcpListener(): boolean {
    return this.server.listening;
  }

  /** All requests captured since the last `reset()` call. */
  get requests(): readonly CapturedRequest[] {
    return this._requests;
  }

  /** Register a per-path handler (matches the URL path only, not query). */
  setHandler(path: string, response: MockResponse | Handler): void {
    const handler: Handler = typeof response === 'function' ? response : () => response;
    this.handlers.set(path, handler);
  }

  /** Set the fallback handler used when no per-path handler matches. */
  setDefaultHandler(handler: Handler): void {
    this.defaultHandler = handler;
  }

  /** Clear both captured requests and all registered per-path handlers. */
  reset(): void {
    this._requests = [];
    this.handlers.clear();
    this.defaultHandler = () => ({ status: 200, body: {} });
  }

  async start(): Promise<void> {
    this._baseUrl = await this.network.listen(this.server);
  }

  close(): Promise<void> {
    return this.network.close(this.server);
  }

  /** Redirect SDK calls to this origin while preserving the request path, query and body. */
  routeFetch(send: typeof fetch = this.network.fetch): typeof fetch {
    return (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input);
      const origin = new URL(this.baseUrl);
      url.protocol = origin.protocol;
      url.hostname = origin.hostname;
      url.port = origin.port;
      const request = input instanceof Request ? new Request(url, input) : url;
      return send(request, init);
    };
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Capture the raw body before routing so all requests are recorded.
    const rawBody = await readBody(req);

    const rawUrl = req.url ?? '/';
    const qIdx = rawUrl.indexOf('?');
    const path = qIdx === -1 ? rawUrl : rawUrl.slice(0, qIdx);
    const query = qIdx === -1 ? '' : rawUrl.slice(qIdx + 1);

    // Lower-case all header keys for deterministic assertion.
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        headers[key.toLowerCase()] = value.join(', ');
      }
    }

    const captured: CapturedRequest = {
      method: req.method ?? 'GET',
      path,
      query,
      headers,
      body: rawBody,
    };
    this._requests.push(captured);

    // Route to the most specific handler.
    const handlerFn = this.handlers.get(path) ?? this.defaultHandler;
    let mockResponse: MockResponse;
    try {
      mockResponse = await Promise.resolve(handlerFn(captured));
    } catch (err) {
      res.writeHead(500);
      res.end(`Handler threw: ${String(err)}`);
      return;
    }

    const { status = 200, headers: responseHeaders = {}, body, delayMs = 0 } = mockResponse;

    if (delayMs > 0) {
      await delay(delayMs);
    }

    let bodyText = '';
    const outHeaders: Record<string, string> = { ...responseHeaders };

    if (body !== undefined) {
      if (typeof body === 'string') {
        bodyText = body;
      } else {
        bodyText = JSON.stringify(body);
        // Only set Content-Type when the caller didn't supply one.
        if (!Object.keys(outHeaders).some((k) => k.toLowerCase() === 'content-type')) {
          outHeaders['Content-Type'] = 'application/json';
        }
      }
      // Only set Content-Length when the caller didn't supply one.
      if (!Object.keys(outHeaders).some((k) => k.toLowerCase() === 'content-length')) {
        outHeaders['Content-Length'] = String(Buffer.byteLength(bodyText, 'utf-8'));
      }
    }

    res.writeHead(status, outHeaders);
    if (bodyText !== '') {
      res.end(bodyText);
    } else {
      res.end();
    }
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
