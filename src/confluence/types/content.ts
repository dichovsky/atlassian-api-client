/**
 * Built-in v2 Confluence content types. Comment content is split into
 * `inline-comment` and `footer-comment` (distinct from v1, which represented
 * both as the single `comment` type). Custom content types are server-defined
 * strings that fall outside this union — see {@link ConvertContentIdsToTypesResponse}.
 */
export type ConfluenceContentType =
  | 'page'
  | 'blogpost'
  | 'attachment'
  | 'footer-comment'
  | 'inline-comment';

/**
 * Request body for `POST /content/convert-ids-to-types`.
 *
 * `contentIds` accepts strings or numbers per the OpenAPI spec; the server
 * caps the array at 100 entries (validated server-side — this SDK does not
 * pre-flight the cap to avoid two sources of truth).
 */
export interface ConvertContentIdsToTypesData {
  readonly contentIds: readonly (string | number)[];
}

/**
 * Response shape for `POST /content/convert-ids-to-types`.
 *
 * `results` maps each requested content id (as a string key) to either a
 * known {@link ConfluenceContentType}, a custom content type identifier
 * (server-defined string), or `null` when the caller cannot view the id or
 * the id does not exist.
 */
export interface ConvertContentIdsToTypesResponse {
  readonly results?: Readonly<Record<string, ConfluenceContentType | string | null>>;
}
