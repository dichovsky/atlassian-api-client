import type { ConfluenceVersion } from './body.js';

/**
 * Any value representable as JSON. Used for content-property values which the
 * spec describes as "Value of the property. Must be a valid JSON value." This
 * recursive union is type-safe across nested arrays and objects.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { readonly [k: string]: JsonValue };

/** Confluence Content Property. */
export interface ContentProperty {
  readonly id: string;
  readonly key: string;
  readonly value: JsonValue;
  readonly version?: ConfluenceVersion;
}

/** Parameters for listing content properties on a page. */
export interface ListContentPropertiesParams {
  readonly key?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Request body for creating a content property on a page. */
export interface CreateContentPropertyData {
  readonly key: string;
  readonly value: JsonValue;
}

/** Request body for updating a content property on a page. */
export interface UpdateContentPropertyData {
  readonly key: string;
  readonly value: JsonValue;
  readonly version: { readonly number: number; readonly message?: string };
}
