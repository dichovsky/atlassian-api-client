import { describe, it, expect } from 'vitest';
import {
  extractCursor,
  paginateCursor,
  paginateOffset,
  paginateSearch,
} from '../../src/core/pagination.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type {
  CursorPaginatedResponse,
  OffsetPaginatedResponse,
  SearchPaginatedResponse,
} from '../../src/core/pagination.js';

// ---------------------------------------------------------------------------
// Helper to collect all items from an async generator
// ---------------------------------------------------------------------------
async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) {
    items.push(item);
  }
  return items;
}

// ---------------------------------------------------------------------------
// extractCursor
// ---------------------------------------------------------------------------
describe('extractCursor', () => {
  it('extracts cursor param from a full URL', () => {
    const result = extractCursor(
      'https://api.atlassian.net/wiki/api/v2/pages?cursor=abc123&limit=50',
    );
    expect(result).toBe('abc123');
  });

  it('extracts cursor param from a relative URL', () => {
    const result = extractCursor('/wiki/api/v2/pages?cursor=xyz&limit=25');
    expect(result).toBe('xyz');
  });

  it('returns undefined when cursor param is absent', () => {
    const result = extractCursor('https://api.atlassian.net/wiki/api/v2/pages?limit=50');
    expect(result).toBeUndefined();
  });

  it('returns undefined when nextUrl is undefined', () => {
    expect(extractCursor(undefined)).toBeUndefined();
  });

  it('returns undefined when nextUrl is an empty string', () => {
    expect(extractCursor('')).toBeUndefined();
  });

  it('returns undefined for an invalid URL that cannot be parsed', () => {
    // Provide a truly unparseable string. Since the implementation wraps with
    // a dummy base, even relative paths parse. Force a parse failure by using
    // a colon-only scheme that is invalid even with the dummy base fallback:
    // The function catches the URL constructor throw and returns undefined.
    // We can trigger it via a string that new URL(str, base) still throws on.
    // In practice the try/catch branch is the only way to reach undefined via
    // a thrown URL — use a known-invalid combo:
    const result = extractCursor('http://[invalid]:abc/path');
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// paginateCursor
// ---------------------------------------------------------------------------
describe('paginateCursor', () => {
  it('yields nothing for empty results with no next link', async () => {
    const transport = new MockTransport();
    const page: CursorPaginatedResponse<string> = {
      results: [],
      _links: {},
    };
    transport.respondWith(page);

    const items = await collect(paginateCursor<string>(transport, '/pages'));
    expect(items).toEqual([]);
    expect(transport.calls).toHaveLength(1);
  });

  it('yields all items from a single page (no next link)', async () => {
    const transport = new MockTransport();
    const page: CursorPaginatedResponse<number> = {
      results: [1, 2, 3],
      _links: {},
    };
    transport.respondWith(page);

    const items = await collect(paginateCursor<number>(transport, '/items'));
    expect(items).toEqual([1, 2, 3]);
    expect(transport.calls).toHaveLength(1);
  });

  it('paginates across multiple pages using cursor', async () => {
    const transport = new MockTransport();

    const page1: CursorPaginatedResponse<string> = {
      results: ['a', 'b'],
      _links: { next: '/pages?cursor=PAGE2&limit=2' },
    };
    const page2: CursorPaginatedResponse<string> = {
      results: ['c', 'd'],
      _links: { next: '/pages?cursor=PAGE3&limit=2' },
    };
    const page3: CursorPaginatedResponse<string> = {
      results: ['e'],
      _links: {},
    };

    transport.respondWith(page1).respondWith(page2).respondWith(page3);

    const items = await collect(paginateCursor<string>(transport, '/pages'));
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(transport.calls).toHaveLength(3);
  });

  it('passes initial query params and cursor on subsequent pages', async () => {
    const transport = new MockTransport();

    const page1: CursorPaginatedResponse<string> = {
      results: ['x'],
      _links: { next: '/pages?cursor=NEXT&limit=1' },
    };
    const page2: CursorPaginatedResponse<string> = {
      results: ['y'],
      _links: {},
    };

    transport.respondWith(page1).respondWith(page2);

    await collect(paginateCursor<string>(transport, '/pages', { spaceId: '123' }));

    // First call should NOT have cursor
    expect(transport.calls[0]!.options.query).toEqual({ spaceId: '123' });
    // Second call should have cursor extracted from page1's next link
    expect(transport.calls[1]!.options.query).toEqual({ spaceId: '123', cursor: 'NEXT' });
  });
});

// ---------------------------------------------------------------------------
// paginateOffset
// ---------------------------------------------------------------------------
describe('paginateOffset', () => {
  it('yields nothing for empty values array', async () => {
    const transport = new MockTransport();
    const page: OffsetPaginatedResponse<string> = {
      values: [],
      startAt: 0,
      maxResults: 50,
      total: 0,
    };
    transport.respondWith(page);

    const items = await collect(paginateOffset<string>(transport, '/issues'));
    expect(items).toEqual([]);
    expect(transport.calls).toHaveLength(1);
  });

  it('yields all items from a single page when isLast is true', async () => {
    const transport = new MockTransport();
    const page: OffsetPaginatedResponse<number> = {
      values: [10, 20, 30],
      startAt: 0,
      maxResults: 50,
      isLast: true,
    };
    transport.respondWith(page);

    const items = await collect(paginateOffset<number>(transport, '/items'));
    expect(items).toEqual([10, 20, 30]);
    expect(transport.calls).toHaveLength(1);
  });

  it('paginates across multiple pages using total', async () => {
    const transport = new MockTransport();

    const page1: OffsetPaginatedResponse<number> = {
      values: [1, 2],
      startAt: 0,
      maxResults: 2,
      total: 4,
    };
    const page2: OffsetPaginatedResponse<number> = {
      values: [3, 4],
      startAt: 2,
      maxResults: 2,
      total: 4,
    };

    transport.respondWith(page1).respondWith(page2);

    const items = await collect(paginateOffset<number>(transport, '/items', {}, 2));
    expect(items).toEqual([1, 2, 3, 4]);
    expect(transport.calls).toHaveLength(2);
  });

  it('stops when startAt + maxResults reaches total', async () => {
    const transport = new MockTransport();

    // 3 items, page size 2 → page 1 has 2 items, page 2 has 1 item
    const page1: OffsetPaginatedResponse<string> = {
      values: ['a', 'b'],
      startAt: 0,
      maxResults: 2,
      total: 3,
    };
    const page2: OffsetPaginatedResponse<string> = {
      values: ['c'],
      startAt: 2,
      maxResults: 2,
      total: 3,
    };

    transport.respondWith(page1).respondWith(page2);

    const items = await collect(paginateOffset<string>(transport, '/items', {}, 2));
    expect(items).toEqual(['a', 'b', 'c']);
    expect(transport.calls).toHaveLength(2);
  });

  it('stops when values is empty even without total or isLast', async () => {
    const transport = new MockTransport();
    const page: OffsetPaginatedResponse<string> = {
      values: [],
      startAt: 0,
      maxResults: 50,
    };
    transport.respondWith(page);

    const items = await collect(paginateOffset<string>(transport, '/items'));
    expect(items).toEqual([]);
    expect(transport.calls).toHaveLength(1);
  });

  it('sends correct startAt on second page', async () => {
    const transport = new MockTransport();

    const page1: OffsetPaginatedResponse<number> = {
      values: [1, 2],
      startAt: 0,
      maxResults: 2,
      total: 3,
    };
    const page2: OffsetPaginatedResponse<number> = {
      values: [3],
      startAt: 2,
      maxResults: 2,
      total: 3,
    };

    transport.respondWith(page1).respondWith(page2);
    await collect(paginateOffset<number>(transport, '/items', {}, 2));

    expect(transport.calls[0]!.options.query).toMatchObject({ startAt: 0, maxResults: 2 });
    expect(transport.calls[1]!.options.query).toMatchObject({ startAt: 2, maxResults: 2 });
  });

  it('terminates on a short page when isLast and total are absent', async () => {
    // Server's own maxResults is 10 but it returned only 2 rows and didn't set
    // isLast or total. Without short-page termination the generator would issue
    // a trailing empty request. The generator must recognize the short page
    // (values.length < response.maxResults) as the last one.
    const transport = new MockTransport();
    const page: OffsetPaginatedResponse<string> = {
      values: ['a', 'b'],
      startAt: 0,
      maxResults: 10,
    };
    transport.respondWith(page);

    const items = await collect(paginateOffset<string>(transport, '/items', {}, 10));
    expect(items).toEqual(['a', 'b']);
    expect(transport.calls).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// paginateSearch
// ---------------------------------------------------------------------------
describe('paginateSearch', () => {
  it('yields nothing for empty issues array', async () => {
    const transport = new MockTransport();
    const page: SearchPaginatedResponse<object> = {
      issues: [],
      startAt: 0,
      maxResults: 50,
      total: 0,
    };
    transport.respondWith(page);

    const items = await collect(paginateSearch<object>(transport, '/search', {}));
    expect(items).toEqual([]);
    expect(transport.calls).toHaveLength(1);
  });

  it('yields all items from a single page', async () => {
    const transport = new MockTransport();
    const issue = { id: 'PROJ-1' };
    const page: SearchPaginatedResponse<typeof issue> = {
      issues: [issue],
      startAt: 0,
      maxResults: 50,
      total: 1,
    };
    transport.respondWith(page);

    const items = await collect(
      paginateSearch<typeof issue>(transport, '/search', { jql: 'project=PROJ' }),
    );
    expect(items).toEqual([issue]);
    expect(transport.calls).toHaveLength(1);
  });

  it('paginates across multiple pages using total', async () => {
    const transport = new MockTransport();

    const page1: SearchPaginatedResponse<number> = {
      issues: [1, 2],
      startAt: 0,
      maxResults: 2,
      total: 4,
    };
    const page2: SearchPaginatedResponse<number> = {
      issues: [3, 4],
      startAt: 2,
      maxResults: 2,
      total: 4,
    };

    transport.respondWith(page1).respondWith(page2);

    const items = await collect(
      paginateSearch<number>(transport, '/search', { jql: 'project=X' }, 2),
    );
    expect(items).toEqual([1, 2, 3, 4]);
    expect(transport.calls).toHaveLength(2);
  });

  it('stops when issues array is empty', async () => {
    const transport = new MockTransport();
    const page: SearchPaginatedResponse<number> = {
      issues: [],
      startAt: 0,
      maxResults: 50,
    };
    transport.respondWith(page);

    const items = await collect(paginateSearch<number>(transport, '/search', {}));
    expect(items).toEqual([]);
    expect(transport.calls).toHaveLength(1);
  });

  it('sends correct pagination params in body', async () => {
    const transport = new MockTransport();

    const page1: SearchPaginatedResponse<number> = {
      issues: [1, 2],
      startAt: 0,
      maxResults: 2,
      total: 3,
    };
    const page2: SearchPaginatedResponse<number> = {
      issues: [3],
      startAt: 2,
      maxResults: 2,
      total: 3,
    };

    transport.respondWith(page1).respondWith(page2);
    await collect(paginateSearch<number>(transport, '/search', { jql: 'project=X' }, 2));

    expect(transport.calls[0]!.options.body).toMatchObject({
      startAt: 0,
      maxResults: 2,
      jql: 'project=X',
    });
    expect(transport.calls[1]!.options.body).toMatchObject({
      startAt: 2,
      maxResults: 2,
      jql: 'project=X',
    });
  });

  it('uses POST method', async () => {
    const transport = new MockTransport();
    const page: SearchPaginatedResponse<number> = {
      issues: [],
      startAt: 0,
      maxResults: 50,
      total: 0,
    };
    transport.respondWith(page);

    await collect(paginateSearch<number>(transport, '/search', {}));
    expect(transport.calls[0]!.options.method).toBe('POST');
  });

  it('terminates on a short page when total is absent', async () => {
    // Server's own maxResults is 10 but only 2 issues came back and `total`
    // was omitted. Generator must treat the short page as final.
    const transport = new MockTransport();
    const page: SearchPaginatedResponse<number> = {
      issues: [1, 2],
      startAt: 0,
      maxResults: 10,
    };
    transport.respondWith(page);

    const items = await collect(paginateSearch<number>(transport, '/search', {}, 10));
    expect(items).toEqual([1, 2]);
    expect(transport.calls).toHaveLength(1);
  });
});
