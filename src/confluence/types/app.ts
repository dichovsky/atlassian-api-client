/**
 * Confluence app property. Returned by the v2 `/app/properties` endpoints.
 * `value` is whatever JSON the app stored — could be a string, number, boolean,
 * array, or arbitrary object.
 */
export interface AppProperty {
  readonly key: string;
  readonly value: unknown;
}

/** Parameters for listing app properties (cursor-paginated). */
export interface ListAppPropertiesParams {
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * Body for creating or updating an app property.
 *
 * The Confluence v2 PUT endpoint accepts the raw JSON value as the request
 * body; we wrap it in `{ value }` so the resource API stays self-documenting
 * (the caller knows the wrapper is local, not on the wire).
 */
export interface UpsertAppPropertyData {
  readonly value: unknown;
}
