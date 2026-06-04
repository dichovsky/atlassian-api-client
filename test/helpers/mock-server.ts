/**
 * In-process HTTP mock server for testing HttpTransport over a real socket.
 *
 * Uses `node:http` exclusively — no third-party dependencies. Binds on
 * `127.0.0.1:0` (ephemeral port) so tests run concurrently without port
 * conflicts. The base URL is exposed immediately after `start()` resolves.
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

  constructor() {
    this.server = http.createServer((req, res) => {
      void this.handleRequest(req, res);
    });
  }

  /** Resolved base URL (e.g. `http://127.0.0.1:PORT`). Available after `start()`. */
  get baseUrl(): string {
    return this._baseUrl;
  }

  /** All requests captured since the last `resetRequests()` call. */
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

  /** Clear captured requests (useful in beforeEach when the server is shared). */
  resetRequests(): void {
    this._requests = [];
  }

  /** Clear both captured requests and all registered per-path handlers. */
  reset(): void {
    this._requests = [];
    this.handlers.clear();
    this.defaultHandler = () => ({ status: 200, body: {} });
  }

  /** Start the server and wait until it is ready to accept connections. */
  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(0, '127.0.0.1', () => {
        this.server.removeListener('error', reject);
        const addr = this.server.address() as { address: string; port: number };
        this._baseUrl = `http://${addr.address}:${addr.port}`;
        resolve();
      });
    });
  }

  /** Stop the server and wait until all connections are closed. */
  async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
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

/**
 * Create a `fetch` shim that transparently forwards all requests to the given
 * `targetBaseUrl` while preserving the original path, query string, and all
 * other request attributes.
 *
 * This lets `HttpTransport` believe it is talking to its configured `baseUrl`
 * (e.g. `https://test.atlassian.net/wiki/api/v2`) while actually communicating
 * with the in-process `MockServer` over a real TCP socket — exercising the full
 * HTTP path without bypassing the real `fetch` implementation.
 */
export function makeMockFetch(targetBaseUrl: string): typeof fetch {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const originalUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    // Replace the origin (scheme + host + port) of the original URL with the
    // mock server's origin while keeping the path and query intact.
    const parsed = new URL(originalUrl);
    const target = new URL(targetBaseUrl);
    parsed.protocol = target.protocol;
    parsed.hostname = target.hostname;
    parsed.port = target.port;
    return fetch(parsed.toString(), init);
  };
}
