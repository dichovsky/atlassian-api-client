/** Confluence Content Version. */
export interface ContentVersion {
  readonly number: number;
  readonly message?: string;
  readonly minorEdit?: boolean;
  readonly authorId?: string;
  readonly createdAt?: string;
}

/** Parameters for listing content versions. */
export interface ListVersionsParams {
  readonly limit?: number;
  readonly cursor?: string;
}
