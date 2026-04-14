/**
 * Performance benchmarks for pagination helpers over large simulated datasets.
 * Run: npm run bench
 */
import { bench, describe } from 'vitest';
import { paginateCursor, paginateOffset, paginateSearch } from '../src/core/pagination.js';
import type { Transport, RequestOptions, ApiResponse } from '../src/core/types.js';

/** Build a mock Transport that returns N items split across pages of `pageSize`. */
function makeCursorTransport(totalItems: number, pageSize: number): Transport {
  return {
    async request<T>(opts: RequestOptions): Promise<ApiResponse<T>> {
      const cursor = (opts.query?.['cursor'] as string | undefined) ?? '0';
      const startAt = parseInt(cursor, 10);
      const slice = Array.from({ length: Math.min(pageSize, totalItems - startAt) }, (_, i) => ({
        id: String(startAt + i),
      }));
      const next = startAt + pageSize < totalItems ? String(startAt + pageSize) : undefined;
      return {
        data: {
          results: slice,
          _links: next ? { next: `/pages?cursor=${next}` } : {},
        } as T,
        status: 200,
        headers: new Headers(),
      };
    },
  };
}

function makeOffsetTransport(totalItems: number, pageSize: number): Transport {
  return {
    async request<T>(opts: RequestOptions): Promise<ApiResponse<T>> {
      const startAt = (opts.query?.['startAt'] as number | undefined) ?? 0;
      const maxResults = (opts.query?.['maxResults'] as number | undefined) ?? pageSize;
      const slice = Array.from({ length: Math.min(maxResults, totalItems - startAt) }, (_, i) => ({
        id: String(startAt + i),
      }));
      return {
        data: {
          values: slice,
          startAt,
          maxResults,
          total: totalItems,
          isLast: startAt + maxResults >= totalItems,
        } as T,
        status: 200,
        headers: new Headers(),
      };
    },
  };
}

function makeSearchTransport(totalItems: number, pageSize: number): Transport {
  return {
    async request<T>(opts: RequestOptions): Promise<ApiResponse<T>> {
      const body = opts.body as Record<string, number> | undefined;
      const startAt = body?.['startAt'] ?? 0;
      const maxResults = body?.['maxResults'] ?? pageSize;
      const slice = Array.from({ length: Math.min(maxResults, totalItems - startAt) }, (_, i) => ({
        id: String(startAt + i),
      }));
      return {
        data: {
          issues: slice,
          startAt,
          maxResults,
          total: totalItems,
        } as T,
        status: 200,
        headers: new Headers(),
      };
    },
  };
}

async function drainGenerator<T>(gen: AsyncGenerator<T>): Promise<number> {
  let count = 0;
  for await (const _ of gen) count++;
  return count;
}

describe('paginateCursor — Confluence cursor pagination', () => {
  bench('100 items, page size 25', async () => {
    const transport = makeCursorTransport(100, 25);
    await drainGenerator(paginateCursor(transport, '/pages'));
  });

  bench('1 000 items, page size 50', async () => {
    const transport = makeCursorTransport(1000, 50);
    await drainGenerator(paginateCursor(transport, '/pages'));
  });

  bench('10 000 items, page size 250', async () => {
    const transport = makeCursorTransport(10_000, 250);
    await drainGenerator(paginateCursor(transport, '/pages'));
  });
});

describe('paginateOffset — Jira offset pagination', () => {
  bench('100 items, page size 25', async () => {
    const transport = makeOffsetTransport(100, 25);
    await drainGenerator(paginateOffset(transport, '/issue', {}, 25));
  });

  bench('1 000 items, page size 50', async () => {
    const transport = makeOffsetTransport(1000, 50);
    await drainGenerator(paginateOffset(transport, '/issue', {}, 50));
  });

  bench('10 000 items, page size 250', async () => {
    const transport = makeOffsetTransport(10_000, 250);
    await drainGenerator(paginateOffset(transport, '/issue', {}, 250));
  });
});

describe('paginateSearch — Jira search pagination', () => {
  bench('100 items, page size 25', async () => {
    const transport = makeSearchTransport(100, 25);
    await drainGenerator(paginateSearch(transport, '/search', { jql: 'project = TEST' }, 25));
  });

  bench('1 000 items, page size 50', async () => {
    const transport = makeSearchTransport(1000, 50);
    await drainGenerator(paginateSearch(transport, '/search', { jql: 'project = TEST' }, 50));
  });

  bench('10 000 items, page size 250', async () => {
    const transport = makeSearchTransport(10_000, 250);
    await drainGenerator(paginateSearch(transport, '/search', { jql: 'project = TEST' }, 250));
  });
});
