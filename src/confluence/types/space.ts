/** Confluence Space. */
export interface Space {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly type: string;
  readonly status: string;
  readonly description?: Record<string, unknown>;
  readonly homepageId?: string;
  readonly createdAt?: string;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing Confluence spaces. */
export interface ListSpacesParams {
  readonly keys?: string[];
  readonly type?: string;
  readonly status?: string;
  readonly limit?: number;
  readonly cursor?: string;
}
