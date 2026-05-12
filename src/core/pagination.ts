import type { Transport, RequestOptions, Logger } from './types.js';
import { PaginationError, ValidationError } from './errors.js';

/**
 * Validate a pagination size value (maxResults / pageSize / limit).
 * Throws RangeError for zero, negative, non-integer, or non-finite values.
 */
export function validatePageSize(value: number, name = 'pageSize'): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer, got: ${value}`);
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
    const { values, isLast, total, maxResults } = response.data;

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

    if (isLast === true || values.length === 0) {
      done = true;
    } else if (total !== undefined && startAt + maxResults >= total) {
      done = true;
    } else if (values.length < maxResults) {
      // Short page — the server returned fewer rows than its own maxResults
      // for this page, so there is no further data even if the response
      // omitted `isLast` and `total`. Avoids an unnecessary trailing request.
      done = true;
    } else {
      startAt += maxResults;
    }
  }
}

/**
 * Async generator for Jira search pagination (uses 'issues' key).
 * Yields individual items across all pages.
 *
 * Stops cleanly once {@link PaginateOptions.maxPages} pages have been fetched
 * (default 10000), emitting a single `warn` at the 80% threshold.
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
    const { issues, total, maxResults } = response.data;

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
      done = true;
    } else if (total !== undefined && startAt + maxResults >= total) {
      done = true;
    } else if (issues.length < maxResults) {
      // Short page — the server returned fewer rows than its own maxResults
      // for this page, so there is no further data even if the response
      // omitted `total`.
      done = true;
    } else {
      startAt += maxResults;
    }
  }
}
