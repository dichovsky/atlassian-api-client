import type { BodyFormat } from './body.js';

/** Confluence Content Version. Mirrors spec `Version` / `DetailedVersion`. */
export interface ContentVersion {
  readonly number: number;
  readonly message?: string;
  readonly minorEdit?: boolean;
  readonly authorId?: string;
  readonly createdAt?: string;
  /** Whether the content-type of the underlying entity was modified in this version (`DetailedVersion`). */
  readonly contentTypeModified?: boolean;
}

/** Parameters for listing content versions. */
export interface ListVersionsParams {
  readonly limit?: number;
  readonly cursor?: string;
  /** Body format requested for any embedded body fields in detail endpoints. */
  readonly 'body-format'?: BodyFormat;
}
