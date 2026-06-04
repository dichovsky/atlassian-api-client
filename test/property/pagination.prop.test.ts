/**
 * B014 — Property-based tests for src/core/pagination.ts
 *
 * Invariants tested:
 * 1. paginateOffset yields every item exactly once across arbitrary page sequences.
 * 2. paginateOffset stops on explicit isLast=true, honouring the server signal.
 * 3. paginateOffset stops on a short page when isLast is absent.
 * 4. paginateOffset stops when startAt+values.length >= total.
 * 5. paginateCursor yields every item exactly once across arbitrary cursor chains.
 * 6. paginateCursor stops cleanly when _links.next is absent.
 * 7. validatePageSize accepts any positive integer and rejects others.
 * 8. paginateSearch yields every item exactly once.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  paginateOffset,
  paginateCursor,
  paginateSearch,
  validatePageSize,
} from '../../src/core/pagination.js';
import type {
  OffsetPaginatedResponse,
  CursorPaginatedResponse,
  SearchPaginatedResponse,
} from '../../src/core/pagination.js';
import type { Transport, RequestOptions, ApiResponse } from '../../src/core/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) items.push(item);
  return items;
}

/** Build a Transport that serves a fixed sequence of OffsetPaginatedResponse pages. */
function makeOffsetTransport<T>(pages: OffsetPaginatedResponse<T>[]): Transport {
  let idx = 0;
  return {
    async request<R>(_opts: RequestOptions): Promise<ApiResponse<R>> {
      const page = pages[idx++];
      if (!page) throw new Error('Offset transport: no more pages');
      return { data: page as unknown as R, status: 200, headers: new Headers() };
    },
  };
}

/** Build a Transport that serves a fixed sequence of CursorPaginatedResponse pages. */
function makeCursorTransport<T>(pages: CursorPaginatedResponse<T>[]): Transport {
  let idx = 0;
  return {
    async request<R>(_opts: RequestOptions): Promise<ApiResponse<R>> {
      const page = pages[idx++];
      if (!page) throw new Error('Cursor transport: no more pages');
      return { data: page as unknown as R, status: 200, headers: new Headers() };
    },
  };
}

/** Build a Transport that serves a fixed sequence of SearchPaginatedResponse pages. */
function makeSearchTransport<T>(pages: SearchPaginatedResponse<T>[]): Transport {
  let idx = 0;
  return {
    async request<R>(_opts: RequestOptions): Promise<ApiResponse<R>> {
      const page = pages[idx++];
      if (!page) throw new Error('Search transport: no more pages');
      return { data: page as unknown as R, status: 200, headers: new Headers() };
    },
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates OffsetPaginatedResponse pages whose shape satisfies the paginator's
 * termination logic without triggering false short-page stops:
 * - All interior pages are exactly `pageSize` items (never short, so the short-page
 *   heuristic doesn't fire mid-sequence).
 * - The last page has isLast=true and may be any length 1..pageSize.
 * - `total` is set to the actual sum so the total-exhaustion path is also covered.
 *
 * The paginator stops on isLast=true on the last page, which is always correct.
 */
const offsetPagesArb = fc
  .tuple(
    fc.integer({ min: 1, max: 3 }), // number of interior full pages (0..n-1)
    fc.integer({ min: 1, max: 10 }), // last page size
  )
  .chain(([numFullPages, lastPageSize]) => {
    const pageSize = 10;
    // Build unique items using a global counter embedded in page index + position.
    // Each item is a unique integer: pageIndex * 100 + position.
    const fullPages: number[][] = Array.from({ length: numFullPages }, (_, pi) =>
      Array.from({ length: pageSize }, (__, pos) => pi * 100 + pos),
    );
    const lastItems = Array.from({ length: lastPageSize }, (_, pos) => numFullPages * 100 + pos);
    const total = numFullPages * pageSize + lastPageSize;
    const allPages: OffsetPaginatedResponse<number>[] = [
      ...fullPages.map((values, i) => ({
        values,
        startAt: i * pageSize,
        maxResults: pageSize,
        total,
        isLast: undefined as boolean | undefined,
      })),
      {
        values: lastItems,
        startAt: numFullPages * pageSize,
        maxResults: pageSize,
        total,
        isLast: true as boolean | undefined,
      },
    ];
    const expected = [...fullPages.flat(), ...lastItems];
    // fc.constant wraps the computed value in an arbitrary.
    return fc.constant({ pages: allPages, expected });
  });

/**
 * Generates cursor-linked pages: each interior page carries a next URL with a
 * unique cursor; the last page has no next URL so iteration terminates.
 * Items are unique integers.
 */
const cursorPagesArb = fc
  .tuple(
    fc.integer({ min: 1, max: 3 }), // number of pages
    fc.integer({ min: 1, max: 15 }), // items per page
  )
  .chain(([numPages, itemsPerPage]) => {
    const allItems: number[][] = Array.from({ length: numPages }, (_, pi) =>
      Array.from({ length: itemsPerPage }, (__, pos) => pi * 100 + pos),
    );
    const pages: CursorPaginatedResponse<number>[] = allItems.map((results, i) => ({
      results,
      _links: {
        next:
          i < numPages - 1
            ? `https://api.atlassian.net/wiki/api/v2/pages?cursor=cursor-${i + 1}&limit=${itemsPerPage}`
            : undefined,
      },
    }));
    return fc.constant({ pages, expected: allItems.flat() });
  });

/**
 * Generates SearchPaginatedResponse pages with exact `total` so termination
 * uses the `startAt+issues.length >= total` path.
 * Interior pages are full-sized; the last page may be short.
 */
const searchPagesArb = fc
  .tuple(
    fc.integer({ min: 1, max: 3 }), // number of interior full pages
    fc.integer({ min: 1, max: 10 }), // last page size
  )
  .chain(([numFullPages, lastPageSize]) => {
    const pageSize = 10;
    const fullPages: number[][] = Array.from({ length: numFullPages }, (_, pi) =>
      Array.from({ length: pageSize }, (__, pos) => pi * 100 + pos),
    );
    const lastItems = Array.from({ length: lastPageSize }, (_, pos) => numFullPages * 100 + pos);
    const total = numFullPages * pageSize + lastPageSize;
    const allPages: SearchPaginatedResponse<number>[] = [
      ...fullPages.map((issues, i) => ({
        issues,
        startAt: i * pageSize,
        maxResults: pageSize,
        total,
      })),
      {
        issues: lastItems,
        startAt: numFullPages * pageSize,
        maxResults: pageSize,
        total,
      },
    ];
    const expected = [...fullPages.flat(), ...lastItems];
    return fc.constant({ pages: allPages, expected });
  });

// Seed and numRuns are fixed for determinism and stability.
const FC_OPTIONS: fc.Parameters<unknown> = { seed: 42, numRuns: 150 };

// ---------------------------------------------------------------------------
// paginateOffset properties
// ---------------------------------------------------------------------------

describe('paginateOffset (property)', () => {
  it('yields every item exactly once across arbitrary page sequences', async () => {
    await fc.assert(
      fc.asyncProperty(offsetPagesArb, async ({ pages, expected }) => {
        const transport = makeOffsetTransport(pages);
        const result = await collect(paginateOffset<number>(transport, '/test', {}, 10));
        expect(result).toEqual(expected);
      }),
      FC_OPTIONS,
    );
  });

  it('stops on explicit isLast=true without missing items', async () => {
    // Single page with isLast=true — must yield all its items then stop.
    await fc.assert(
      fc.asyncProperty(
        fc
          .integer({ min: 1, max: 30 })
          .chain((n) => fc.constant(Array.from({ length: n }, (_, i) => i))),
        async (values) => {
          const page: OffsetPaginatedResponse<number> = {
            values,
            startAt: 0,
            maxResults: 50,
            isLast: true,
          };
          const transport = makeOffsetTransport([page]);
          const result = await collect(paginateOffset<number>(transport, '/test', {}, 50));
          expect(result).toEqual(values);
        },
      ),
      FC_OPTIONS,
    );
  });

  it('stops on a short page when isLast is absent', async () => {
    // A page shorter than pageSize with no isLast/total signals termination.
    await fc.assert(
      fc.asyncProperty(
        fc
          .integer({ min: 1, max: 9 })
          .chain((n) => fc.constant(Array.from({ length: n }, (_, i) => i))),
        async (values) => {
          const page: OffsetPaginatedResponse<number> = {
            values,
            startAt: 0,
            maxResults: 10,
            // isLast intentionally absent; total intentionally absent
          };
          const transport = makeOffsetTransport([page]);
          const result = await collect(paginateOffset<number>(transport, '/test', {}, 10));
          expect(result).toEqual(values);
        },
      ),
      FC_OPTIONS,
    );
  });

  it('stops when startAt+values.length >= total', async () => {
    // Two pages whose combined length equals total — second page triggers the
    // total-based stop. Pages are full-sized to prevent short-page early exit.
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }).chain((n) =>
          fc.constant({
            first: Array.from({ length: 10 }, (_, i) => i),
            second: Array.from({ length: n }, (_, i) => 100 + i),
          }),
        ),
        async ({ first, second }) => {
          const total = first.length + second.length;
          const pages: OffsetPaginatedResponse<number>[] = [
            { values: first, startAt: 0, maxResults: 10, total },
            { values: second, startAt: first.length, maxResults: 10, total },
          ];
          const transport = makeOffsetTransport(pages);
          const result = await collect(paginateOffset<number>(transport, '/test', {}, 10));
          expect(result).toEqual([...first, ...second]);
        },
      ),
      FC_OPTIONS,
    );
  });

  it('yields all items and stops when the final page is short and carries no isLast/total', async () => {
    // Exercises the short-page heuristic: a trailing page shorter than pageSize
    // with neither isLast nor total signals termination. This is the regression
    // class from PR #165 (silent row-drop when isLast===false was ignored).
    // Here isLast is absent so the heuristic should fire correctly.
    await fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            fc.integer({ min: 1, max: 3 }), // number of full interior pages
            fc.integer({ min: 1, max: 9 }), // short final page size (< pageSize=10)
          )
          .chain(([numFull, lastSize]) => {
            const pageSize = 10;
            const fullPages: OffsetPaginatedResponse<number>[] = Array.from(
              { length: numFull },
              (_, pi) => ({
                values: Array.from({ length: pageSize }, (__, pos) => pi * 100 + pos),
                startAt: pi * pageSize,
                maxResults: pageSize,
                // No isLast, no total — only the short final page signals done
              }),
            );
            const lastValues = Array.from({ length: lastSize }, (_, pos) => numFull * 100 + pos);
            const lastPage: OffsetPaginatedResponse<number> = {
              values: lastValues,
              startAt: numFull * pageSize,
              maxResults: pageSize,
              // Intentionally no isLast and no total: short-page heuristic must trigger
            };
            const allPages = [...fullPages, lastPage];
            const expected = [...fullPages.flatMap((p) => p.values), ...lastValues];
            return fc.constant({ pages: allPages, expected, pageSize });
          }),
        async ({ pages, expected, pageSize }) => {
          const transport = makeOffsetTransport(pages);
          const result = await collect(paginateOffset<number>(transport, '/test', {}, pageSize));
          expect(result).toEqual(expected);
        },
      ),
      FC_OPTIONS,
    );
  });

  it('honors explicit isLast=false on a short page and continues yielding remaining items', async () => {
    // Exercises the PR #165 regression class: a short page that carries
    // isLast===false must NOT be treated as the last page by the short-page
    // heuristic. The paginator must continue and yield the subsequent pages.
    await fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            fc.integer({ min: 1, max: 9 }), // short mid-stream page size (< pageSize=10)
            fc.integer({ min: 1, max: 3 }), // number of full pages after the short one
          )
          .chain(([shortSize, numTrailing]) => {
            const pageSize = 10;
            // Page 0: a short page with explicit isLast=false (authoritative "more exists")
            const shortPage: OffsetPaginatedResponse<number> = {
              values: Array.from({ length: shortSize }, (_, i) => i),
              startAt: 0,
              maxResults: pageSize,
              isLast: false, // authoritative signal: must not stop here
            };
            // Trailing full pages after the short one
            const trailingPages: OffsetPaginatedResponse<number>[] = Array.from(
              { length: numTrailing },
              (_, pi) => ({
                values: Array.from({ length: pageSize }, (__, pos) => (pi + 1) * 100 + pos),
                startAt: shortSize + pi * pageSize,
                maxResults: pageSize,
                isLast: pi === numTrailing - 1 ? (true as boolean | undefined) : undefined,
              }),
            );
            const allPages = [shortPage, ...trailingPages];
            const expected = [...shortPage.values, ...trailingPages.flatMap((p) => p.values)];
            return fc.constant({ pages: allPages, expected, pageSize });
          }),
        async ({ pages, expected, pageSize }) => {
          const transport = makeOffsetTransport(pages);
          const result = await collect(paginateOffset<number>(transport, '/test', {}, pageSize));
          // Every item from every page must appear exactly once — no drops, no dups.
          expect(result).toEqual(expected);
        },
      ),
      FC_OPTIONS,
    );
  });
});

// ---------------------------------------------------------------------------
// paginateCursor properties
// ---------------------------------------------------------------------------

describe('paginateCursor (property)', () => {
  it('yields every item exactly once across arbitrary cursor chains', async () => {
    await fc.assert(
      fc.asyncProperty(cursorPagesArb, async ({ pages, expected }) => {
        const transport = makeCursorTransport(pages);
        const result = await collect(paginateCursor<number>(transport, '/test'));
        expect(result).toEqual(expected);
      }),
      FC_OPTIONS,
    );
  });

  it('stops immediately when first page has no next link', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .integer({ min: 0, max: 30 })
          .chain((n) => fc.constant(Array.from({ length: n }, (_, i) => i))),
        async (results) => {
          const page: CursorPaginatedResponse<number> = { results, _links: {} };
          const transport = makeCursorTransport([page]);
          const collected = await collect(paginateCursor<number>(transport, '/test'));
          expect(collected).toEqual(results);
        },
      ),
      FC_OPTIONS,
    );
  });
});

// ---------------------------------------------------------------------------
// paginateSearch properties
// ---------------------------------------------------------------------------

describe('paginateSearch (property)', () => {
  it('yields every item exactly once across arbitrary search page sequences', async () => {
    await fc.assert(
      fc.asyncProperty(searchPagesArb, async ({ pages, expected }) => {
        const transport = makeSearchTransport(pages);
        const result = await collect(
          paginateSearch<number>(transport, '/test', { jql: 'project=TEST' }, 10),
        );
        expect(result).toEqual(expected);
      }),
      FC_OPTIONS,
    );
  });

  it('stops on a short page when total is absent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .integer({ min: 1, max: 9 })
          .chain((n) => fc.constant(Array.from({ length: n }, (_, i) => i))),
        async (issues) => {
          const page: SearchPaginatedResponse<number> = {
            issues,
            startAt: 0,
            maxResults: 10,
            // total absent — triggers short-page heuristic
          };
          const transport = makeSearchTransport([page]);
          const result = await collect(paginateSearch<number>(transport, '/test', { jql: '' }, 10));
          expect(result).toEqual(issues);
        },
      ),
      FC_OPTIONS,
    );
  });
});

// ---------------------------------------------------------------------------
// validatePageSize properties
// ---------------------------------------------------------------------------

describe('validatePageSize (property)', () => {
  it('accepts any positive integer', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (n) => {
        expect(() => validatePageSize(n)).not.toThrow();
      }),
      FC_OPTIONS,
    );
  });

  it('rejects zero and negative integers', () => {
    fc.assert(
      fc.property(fc.integer({ min: -10_000, max: 0 }), (n) => {
        expect(() => validatePageSize(n)).toThrow(RangeError);
      }),
      FC_OPTIONS,
    );
  });

  it('rejects non-finite values (NaN, Infinity, -Infinity)', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(() => validatePageSize(bad)).toThrow(RangeError);
    }
  });

  it('rejects non-integer floats', () => {
    // fc.float requires 32-bit float bounds; Math.fround converts doubles.
    fc.assert(
      fc.property(
        fc
          .float({ min: Math.fround(0.001), max: Math.fround(999), noNaN: true })
          .filter((n) => !Number.isInteger(n)),
        (n) => {
          expect(() => validatePageSize(n)).toThrow(RangeError);
        },
      ),
      FC_OPTIONS,
    );
  });
});
