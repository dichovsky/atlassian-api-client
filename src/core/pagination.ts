import type { Transport, RequestOptions, Logger } from './types.js';
import { PaginationError, ValidationError } from './errors.js';

/**
 * Validate a pagination size value (maxResults / pageSize / limit).
 * Throws {@link ValidationError} for zero, negative, non-integer, or non-finite values.
 */
export function validatePageSize(value: number, name = 'pageSize'): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${name} must be a positive integer, got: ${value}`);
  }
}

/** Confluence v2 cursor-based paginated response. */
export interface CursorPaginatedResponse<T> {
  readonly results: T[];
  readonly _links: {
    readonly next?: string;
    readonly base?: string;
  };
}

/** Jira v3 offset-based paginated response. */
export interface OffsetPaginatedResponse<T> {
  readonly values: T[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total?: number;
  readonly isLast?: boolean;
}

/** Jira search uses 'issues' instead of 'values'. */
export interface SearchPaginatedResponse<T> {
  readonly issues: T[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total?: number;
}

/**
 * Options for the `paginate*` async generators.
 *
 * `maxPages` caps the number of pages the generator will request before
 * stopping cleanly (default {@link DEFAULT_MAX_PAGES}). A single warning is
 * emitted via `logger.warn` once the page count crosses 80% of the limit so
 * runaway iteration is observable before it terminates.
 */
export interface PaginateOptions {
  /**
   * Maximum number of pages to fetch before iteration stops cleanly.
   * @default 10000
   */
  readonly maxPages?: number;
  /** Logger used for warnings (e.g. nearing maxPages, unparsable cursor). */
  readonly logger?: Logger;
}

const DEFAULT_MAX_PAGES = 10_000;

interface ResolvedPaginateOptions {
  readonly maxPages: number;
  readonly logger?: Logger;
}

/**
 * Normalize the 4th argument of `paginateCursor`, which historically accepted
 * a bare `Logger`. New callers may pass `PaginateOptions` instead. The legacy
 * form is detected by duck-typing: a value whose `warn` is a function and that
 * lacks both `maxPages` and `logger` keys is treated as a `Logger`.
 *
 * Throws {@link ValidationError} when the argument is neither `undefined` nor
 * an object (e.g. `null`, a number, or a string) so JS callers that pass the
 * wrong shape get a descriptive failure instead of a `TypeError` from the
 * `in` operator.
 */
function resolvePaginateOptions(
  arg: Logger | PaginateOptions | undefined,
): ResolvedPaginateOptions {
  if (arg === undefined) {
    return { maxPages: DEFAULT_MAX_PAGES };
  }
  if (typeof arg !== 'object' || arg === null) {
    throw new ValidationError(
      `paginateCursor: 4th argument must be a Logger, PaginateOptions, or undefined; got ${arg === null ? 'null' : typeof arg}`,
    );
  }

  const maybeOptions = arg as Partial<PaginateOptions>;
  const hasOptionsKey = 'maxPages' in arg || 'logger' in arg;

  if (!hasOptionsKey && typeof (arg as Logger).warn === 'function') {
    return { maxPages: DEFAULT_MAX_PAGES, logger: arg as Logger };
  }

  return {
    maxPages: maybeOptions.maxPages ?? DEFAULT_MAX_PAGES,
    logger: maybeOptions.logger,
  };
}

function normalizeMaxPages(value: number | undefined): number {
  if (value === undefined) return DEFAULT_MAX_PAGES;
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new RangeError(`maxPages must be a positive integer, got: ${value}`);
  }
  return value;
}

/** Extract the cursor value from a Confluence _links.next URL. */
export function extractCursor(nextUrl: string | undefined): string | undefined {
  if (!nextUrl) return undefined;

  try {
    // The next URL may be a relative path; use a dummy base to parse it
    const url = new URL(nextUrl, 'https://dummy.atlassian.net');
    return url.searchParams.get('cursor') ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Emit a single "nearing maxPages" warning the first time the page count
 * crosses 80% of the cap. Subsequent pages do not re-warn.
 */
function maybeWarnNearLimit(
  pageCount: number,
  threshold: number,
  maxPages: number,
  basePath: string,
  warned: boolean,
  logger: Logger | undefined,
  generator: string,
): boolean {
  if (warned || pageCount < threshold) return warned;
  logger?.warn(`${generator}: nearing maxPages limit`, {
    pageCount,
    maxPages,
    path: basePath,
  });
  return true;
}

/**
 * Async generator for Confluence cursor-based pagination.
 * Yields individual items across all pages.
 *
 * If a non-empty `_links.next` URL is returned but no `cursor` query parameter
 * can be extracted, iteration stops and `logger?.warn` is called so the silent
 * termination is observable (Confluence v2 always includes `cursor`, so an
 * un-parsable next URL typically signals an upstream schema change).
 *
 * Safety guards:
 * - Throws {@link PaginationError} if the server returns the same `cursor`
 *   value on consecutive responses (would otherwise loop forever).
 * - Stops cleanly once {@link PaginateOptions.maxPages} pages have been
 *   fetched (default 10000), emitting a single `warn` at the 80% threshold.
 *
 * The 4th argument accepts either a bare {@link Logger} (legacy positional
 * form) or {@link PaginateOptions}. New code should pass `PaginateOptions`.
 */
export async function* paginateCursor<T>(
  transport: Transport,
  basePath: string,
  query?: Readonly<Record<string, string | number | boolean | undefined>>,
  loggerOrOptions?: Logger | PaginateOptions,
): AsyncGenerator<T> {
  const resolved = resolvePaginateOptions(loggerOrOptions);
  const maxPages = normalizeMaxPages(resolved.maxPages);
  // ceil so the warning fires at or after 80% of the cap (never below it).
  // For maxPages=10000 the threshold is 8000; for very small caps it lands
  // at the cap itself, which is still a useful "you've hit the limit" signal.
  const warnThreshold = Math.ceil(maxPages * 0.8);
  const logger = resolved.logger;

  let cursor: string | undefined;
  let prevCursor: string | undefined;
  let pageCount = 0;
  let warned = false;

  do {
    const requestQuery: Record<string, string | number | boolean | undefined> = {
      ...query,
    };
    if (cursor) {
      requestQuery['cursor'] = cursor;
    }

    const options: RequestOptions = {
      method: 'GET',
      path: basePath,
      query: requestQuery,
    };

    const response = await transport.request<CursorPaginatedResponse<T>>(options);

    for (const item of response.data.results) {
      yield item;
    }

    pageCount += 1;
    warned = maybeWarnNearLimit(
      pageCount,
      warnThreshold,
      maxPages,
      basePath,
      warned,
      logger,
      'paginateCursor',
    );
    if (pageCount >= maxPages) return;

    const nextUrl = response.data._links.next;
    prevCursor = cursor;
    cursor = extractCursor(nextUrl);
    if (nextUrl !== undefined && nextUrl !== '' && cursor === undefined) {
      logger?.warn(
        'paginateCursor: _links.next was returned without a parseable cursor; stopping',
        {
          nextUrl,
          path: basePath,
        },
      );
    }
    if (cursor !== undefined && cursor === prevCursor) {
      throw new PaginationError(
        `paginateCursor: cursor not advancing (stuck at "${cursor}"); aborting to prevent infinite loop`,
      );
    }
  } while (cursor);
}

/**
 * Async generator for Jira offset-based pagination.
 * Yields individual items across all pages.
 *
 * Stops cleanly once {@link PaginateOptions.maxPages} pages have been fetched
 * (default 10000), emitting a single `warn` at the 80% threshold.
 *
 * **Server-value hardening:** advancement uses `values.length` (rows actually
 * delivered), never the server-echoed `maxResults`. Jira may clamp `maxResults`
 * below the requested `pageSize`, or echo a different value entirely; trusting
 * it for cursor advancement would skip or duplicate rows. The server's
 * `maxResults` is retained only as a short-page hint for early termination.
 *
 * **Forward-progress guard:** throws {@link PaginationError} if the server
 * returns an empty page while still signalling more data (`isLast === false`
 * or `total > startAt`). Without this, callers silently receive truncated
 * datasets when the upstream API misbehaves.
 */
export async function* paginateOffset<T>(
  transport: Transport,
  basePath: string,
  query?: Readonly<Record<string, string | number | boolean | undefined>>,
  pageSize = 50,
  options?: PaginateOptions,
): AsyncGenerator<T> {
  validatePageSize(pageSize);
  const maxPages = normalizeMaxPages(options?.maxPages);
  // ceil so the warning fires at or after 80% of the cap (never below it).
  // For maxPages=10000 the threshold is 8000; for very small caps it lands
  // at the cap itself, which is still a useful "you've hit the limit" signal.
  const warnThreshold = Math.ceil(maxPages * 0.8);
  const logger = options?.logger;

  let startAt = 0;
  let done = false;
  let pageCount = 0;
  let warned = false;

  while (!done) {
    const requestQuery: Record<string, string | number | boolean | undefined> = {
      ...query,
      startAt,
      maxResults: pageSize,
    };

    const requestOptions: RequestOptions = {
      method: 'GET',
      path: basePath,
      query: requestQuery,
    };

    const response = await transport.request<OffsetPaginatedResponse<T>>(requestOptions);
    const { values, isLast, total, maxResults: serverMaxResults } = response.data;

    for (const item of values) {
      yield item;
    }

    pageCount += 1;
    warned = maybeWarnNearLimit(
      pageCount,
      warnThreshold,
      maxPages,
      basePath,
      warned,
      logger,
      'paginateOffset',
    );
    if (pageCount >= maxPages) return;

    if (values.length === 0) {
      // Empty page mid-iteration. If the server explicitly says more data
      // exists, that's a forward-progress failure — abort to surface the
      // truncated dataset rather than silently returning partial results.
      const moreExpected = isLast === false || (total !== undefined && startAt < total);
      if (moreExpected) {
        throw new PaginationError(
          `paginateOffset: server returned empty page mid-iteration (startAt=${startAt}, total=${total}); aborting to prevent silent data loss`,
        );
      }
      done = true;
    } else if (isLast === true) {
      done = true;
    } else if (total !== undefined && startAt + values.length >= total) {
      done = true;
    } else if (
      isLast !== false &&
      total === undefined &&
      values.length < Math.min(pageSize, serverMaxResults ?? pageSize)
    ) {
      // Short page — the page is shorter than both the caller's intent and
      // the server's own capacity, so there is no further data. Using
      // `min(pageSize, serverMaxResults)` avoids two failure modes: (1)
      // terminating early when the server clamps `maxResults` below `pageSize`
      // and returns a full clamped page, and (2) trusting a misleadingly large
      // server-echoed `maxResults` when the caller-requested size was met.
      // This heuristic only fires when the server gave NO authoritative
      // continuation signal: an explicit `isLast: false` (e.g. a page trimmed
      // by server-side permission filtering) OR a `total` not yet reached
      // (the `>= total` branch above didn't fire, so `total` says more rows
      // remain) both mean more data exists — fall through and advance rather
      // than silently dropping the rest (#240).
      done = true;
    } else {
      // Advance by the row count actually delivered. Never trust the
      // server-echoed `maxResults` here — Jira may clamp it, causing skips
      // or duplicates if used as the stride.
      startAt += values.length;
    }
  }
}

/**
 * Async generator for Jira search pagination (uses 'issues' key).
 * Yields individual items across all pages.
 *
 * Stops cleanly once {@link PaginateOptions.maxPages} pages have been fetched
 * (default 10000), emitting a single `warn` at the 80% threshold.
 *
 * **Server-value hardening:** advancement uses `issues.length` (rows actually
 * delivered), never the server-echoed `maxResults`. See {@link paginateOffset}
 * for details — the same reasoning applies to search responses.
 *
 * **Forward-progress guard:** throws {@link PaginationError} if the server
 * returns an empty page while `total` indicates more issues remain.
 */
export async function* paginateSearch<T>(
  transport: Transport,
  basePath: string,
  body: Record<string, unknown>,
  pageSize = 50,
  options?: PaginateOptions,
): AsyncGenerator<T> {
  validatePageSize(pageSize);
  const maxPages = normalizeMaxPages(options?.maxPages);
  // ceil so the warning fires at or after 80% of the cap (never below it).
  // For maxPages=10000 the threshold is 8000; for very small caps it lands
  // at the cap itself, which is still a useful "you've hit the limit" signal.
  const warnThreshold = Math.ceil(maxPages * 0.8);
  const logger = options?.logger;

  let startAt = 0;
  let done = false;
  let pageCount = 0;
  let warned = false;

  while (!done) {
    const requestOptions: RequestOptions = {
      method: 'POST',
      path: basePath,
      body: {
        ...body,
        startAt,
        maxResults: pageSize,
      },
    };

    const response = await transport.request<SearchPaginatedResponse<T>>(requestOptions);
    const { issues, total, maxResults: serverMaxResults } = response.data;

    for (const item of issues) {
      yield item;
    }

    pageCount += 1;
    warned = maybeWarnNearLimit(
      pageCount,
      warnThreshold,
      maxPages,
      basePath,
      warned,
      logger,
      'paginateSearch',
    );
    if (pageCount >= maxPages) return;

    if (issues.length === 0) {
      // Empty page mid-iteration. If `total` says more remain, abort to
      // prevent silently returning a truncated result set.
      const moreExpected = total !== undefined && startAt < total;
      if (moreExpected) {
        throw new PaginationError(
          `paginateSearch: server returned empty page mid-iteration (startAt=${startAt}, total=${total}); aborting to prevent silent data loss`,
        );
      }
      done = true;
    } else if (total !== undefined && startAt + issues.length >= total) {
      done = true;
    } else if (
      total === undefined &&
      issues.length < Math.min(pageSize, serverMaxResults ?? pageSize)
    ) {
      // Short page — see paginateOffset for the rationale behind the
      // min(pageSize, serverMaxResults) guard. Only fires when `total` is
      // absent: a present `total` not yet reached (the branch above) means more
      // issues remain, so advance instead of silently truncating (#240).
      done = true;
    } else {
      // Advance by the row count actually delivered (never trust the
      // server-echoed `maxResults`).
      startAt += issues.length;
    }
  }
}
