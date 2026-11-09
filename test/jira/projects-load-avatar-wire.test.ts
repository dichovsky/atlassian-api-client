/**
 * loadAvatar over native fetch and a real socket: MockTransport cannot show
 * what fetch actually puts on the wire for a non-native Blob.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { JiraClient } from '../../src/jira/client.js';
import { MockServer, makeMockFetch } from '../helpers/mock-server.js';

// ASCII bytes: MockServer captures the body as UTF-8 text.
const PNG = new TextEncoder().encode('png-bytes');

describe('projects.loadAvatar() on the wire', () => {
  const server = new MockServer();
  let jira: JiraClient;

  beforeAll(async () => {
    await server.start();
    jira = new JiraClient({
      baseUrl: 'https://test.atlassian.net',
      auth: { type: 'basic', email: 'a@b.c', apiToken: 'token' },
      retries: 0,
      fetch: makeMockFetch(server.baseUrl),
    });
  });
  afterAll(() => server.close());
  beforeEach(() => {
    server.reset();
    server.setHandler('/rest/api/3/project/PROJ/avatar2', { status: 201, body: { id: '1' } });
  });

  const sent = () => {
    const req = server.requests[0];
    if (req === undefined) throw new Error('no request captured');
    return req;
  };

  it('sends a native Blob as the raw image bytes', async () => {
    await jira.projects.loadAvatar('PROJ', new Blob([PNG], { type: 'image/png' }));
    expect(sent().headers['content-type']).toBe('image/png');
    expect(sent().headers['x-atlassian-token']).toBe('no-check');
    expect(sent().body).toBe('png-bytes');
  });

  it('sends a polyfill/foreign-realm Blob as its bytes, not "[object File]"', async () => {
    const foreign = {
      type: 'image/png',
      size: PNG.byteLength,
      arrayBuffer: () => Promise.resolve(PNG.slice().buffer),
      stream: () => new Blob([PNG]).stream(),
      [Symbol.toStringTag]: 'File',
    };
    await jira.projects.loadAvatar('PROJ', foreign);
    expect(sent().headers['content-type']).toBe('image/png');
    expect(sent().body).toBe('png-bytes');
  });
});
