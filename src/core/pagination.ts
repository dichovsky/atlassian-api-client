import type { Transport, RequestOptions, Logger } from './types.js';

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
 * Async generator for Confluence cursor-based pagination.
 * Yields individual items across all pages.
 *
 * If a non-empty `_links.next` URL is returned but no `cursor` query parameter
 * can be extracted, iteration stops and `logger?.warn` is called so the silent
 * termination is observable (Confluence v2 always includes `cursor`, so an
 * un-parsable next URL typically signals an upstream schema change).
 */
export async function* paginateCursor<T>(
  transport: Transport,
  basePath: string,
  query?: Readonly<Record<string, string | number | boolean | undefined>>,
  logger?: Logger,
): AsyncGenerator<T> {
  let cursor: string | undefined;

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

    const nextUrl = response.data._links.next;
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
  } while (cursor);
}

/**
 * Async generator for Jira offset-based pagination.
 * Yields individual items across all pages.
 */
export async function* paginateOffset<T>(
  transport: Transport,
  basePath: string,
  query?: Readonly<Record<string, string | number | boolean | undefined>>,
  pageSize = 50,
): AsyncGenerator<T> {
  validatePageSize(pageSize);
  let startAt = 0;
  let done = false;

  while (!done) {
    const requestQuery: Record<string, string | number | boolean | undefined> = {
      ...query,
      startAt,
      maxResults: pageSize,
    };

    const options: RequestOptions = {
      method: 'GET',
      path: basePath,
      query: requestQuery,
    };

    const response = await transport.request<OffsetPaginatedResponse<T>>(options);
    const { values, isLast, total, maxResults } = response.data;

    for (const item of values) {
      yield item;
    }

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
 */
export async function* paginateSearch<T>(
  transport: Transport,
  basePath: string,
  body: Record<string, unknown>,
  pageSize = 50,
): AsyncGenerator<T> {
  validatePageSize(pageSize);
  let startAt = 0;
  let done = false;

  while (!done) {
    const options: RequestOptions = {
      method: 'POST',
      path: basePath,
      body: {
        ...body,
        startAt,
        maxResults: pageSize,
      },
    };

    const response = await transport.request<SearchPaginatedResponse<T>>(options);
    const { issues, total, maxResults } = response.data;

    for (const item of issues) {
      yield item;
    }

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
