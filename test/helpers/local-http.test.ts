import { once } from 'node:events';
import { createServer, type IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { LocalHttpNetwork } from './local-http.js';

describe('local HTTP fixture', () => {
  it('carries request bodies and follows redirects across distinct local origins', async () => {
    const network = new LocalHttpNetwork({ inProcess: true });
    const originalBodies: string[] = [];
    const first = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      originalBodies.push(Buffer.concat(chunks).toString());
      res.writeHead(307, { location: secondOrigin });
      res.end();
    });
    const second = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      res.end(
        JSON.stringify([req.method, req.headers.authorization, Buffer.concat(chunks).toString()]),
      );
    });
    const secondOrigin = await network.listen(second);
    try {
      const firstOrigin = await network.listen(first);
      const response = await network.fetch(firstOrigin, {
        method: 'POST',
        headers: { Authorization: 'Bearer test' },
        body: 'some bytes',
      });
      expect(originalBodies).toEqual(['some bytes']);
      expect(firstOrigin).not.toBe(secondOrigin);
      // Synthetic origins must never allocate a port Fetch blocks, such as 10080.
      expect(new URL(firstOrigin).port).toBe('');
      expect(await response.json()).toEqual(['POST', null, 'some bytes']);
      await network.close(first);
      await expect(network.fetch(firstOrigin)).rejects.toMatchObject({
        cause: { code: 'ECONNREFUSED' },
      });
      expect(await (await network.fetch(secondOrigin)).json()).toEqual(['GET', null, '']);
    } finally {
      await Promise.all([network.close(first), network.close(second)]);
    }
  });

  it('closes the server-side connection when the caller aborts', async () => {
    const network = new LocalHttpNetwork({ inProcess: true });
    const server = createServer();
    const origin = await network.listen(server);
    const controller = new AbortController();
    try {
      const started = once(server, 'request');
      const response = network.fetch(origin, { signal: controller.signal });
      const [request] = (await started) as [IncomingMessage];
      const disconnected = once(request.socket, 'close');
      controller.abort();
      await expect(response).rejects.toMatchObject({ name: 'AbortError' });
      await disconnected;
    } finally {
      await network.close(server);
    }
  });

  it('refuses to open connections outside this fixture, including a redirected request', async () => {
    const network = new LocalHttpNetwork({ inProcess: true });
    const server = createServer((_req, res) => {
      res.writeHead(302, { location: 'https://unregistered.invalid/' });
      res.end();
    });
    const origin = await network.listen(server);
    try {
      await expect(network.fetch(origin)).rejects.toMatchObject({
        cause: { code: 'ECONNREFUSED' },
      });
    } finally {
      await network.close(server);
    }
  });
});
