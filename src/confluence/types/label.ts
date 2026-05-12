/** Confluence Label. */
export interface Label {
  readonly id: string;
  readonly name: string;
  readonly prefix?: string;
}

/** Parameters for listing labels on a page or blog post. */
export interface ListLabelsParams {
  readonly prefix?: string;
  readonly limit?: number;
  readonly cursor?: string;
}
