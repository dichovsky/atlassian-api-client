/** Parameters for listing content properties on a page. */
export interface ListContentPropertiesParams {
  readonly key?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Request body for updating a content property on a page. */
export interface UpdateContentPropertyData {
  readonly key: string;
  readonly value: unknown;
  readonly version: { readonly number: number; readonly message?: string };
}
