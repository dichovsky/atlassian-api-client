import type { ConfluenceVersion } from './body.js';

/** Confluence Content Property. */
export interface ContentProperty {
  readonly id: string;
  readonly key: string;
  readonly value: unknown;
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
  readonly value: unknown;
}

/** Request body for updating a content property on a page. */
export interface UpdateContentPropertyData {
  readonly key: string;
  readonly value: unknown;
  readonly version: { readonly number: number; readonly message?: string };
}
