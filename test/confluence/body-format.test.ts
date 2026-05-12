import { describe, expect, it } from 'vitest';
import { ConfluenceClient } from '../../src/confluence/client.js';
import type { ContentBody, Page } from '../../src/confluence/types/index.js';
import { MockTransport } from '../helpers/mock-transport.js';

/**
 * B034 — assert ContentBody widens to all 8 spec body-format representations.
 * Each test queues a MockTransport response with a single representation
 * present and confirms the typed body field is readable.
 */
describe('B034: ContentBody covers all 8 spec body representations', () => {
  function buildClient() {
    const transport = new MockTransport();
    const client = new ConfluenceClient({
      baseUrl: 'https://example.atlassian.net',
      auth: { type: 'basic', email: 'u@e.com', apiToken: 't' },
      transport,
    });
    return { client, transport };
  }

  function pageWithBody(body: ContentBody): Page {
    return {
      id: '1',
      status: 'current',
      title: 'T',
      spaceId: 's',
      body,
    };
  }

  const cases: Array<{
    representation: NonNullable<keyof ContentBody>;
    sample: string;
  }> = [
    { representation: 'storage', sample: '<p>storage</p>' },
    { representation: 'atlas_doc_format', sample: '{"version":1,"type":"doc","content":[]}' },
    { representation: 'view', sample: '<p>view</p>' },
    { representation: 'raw', sample: 'raw value' },
    { representation: 'export_view', sample: '<p>export</p>' },
    { representation: 'anonymous_export_view', sample: '<p>anon export</p>' },
    { representation: 'styled_view', sample: '<div style="">styled</div>' },
    { representation: 'editor', sample: '<p>editor</p>' },
  ];

  it.each(cases)('parses $representation body representation', async ({ representation, sample }) => {
    const { client, transport } = buildClient();
    const body: ContentBody = {
      [representation]: { value: sample, representation },
    } as ContentBody;
    transport.respondWith<Page>(pageWithBody(body));
    const page = await client.pages.get('1', { 'body-format': representation });
    expect(page.body?.[representation]?.value).toBe(sample);
    expect(page.body?.[representation]?.representation).toBe(representation);
  });

  it('accepts every BodyFormat value as a query parameter', async () => {
    const { client, transport } = buildClient();
    for (const { representation } of cases) {
      transport.respondWith<Page>(pageWithBody({}));
      await client.pages.get('1', { 'body-format': representation });
    }
    const formats = transport.calls.map((c) => c.options.query?.['body-format']);
    expect(formats).toEqual(cases.map((c) => c.representation));
  });
});
