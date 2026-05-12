/** Version metadata embedded inside Confluence content responses. */
export interface ConfluenceVersion {
  readonly number: number;
  readonly message?: string;
  readonly createdAt?: string;
}

/** Body representation format. */
export type BodyFormat = 'storage' | 'atlas_doc_format' | 'view' | 'raw';

/** Confluence content body. */
export interface ContentBody {
  readonly storage?: { readonly value: string; readonly representation: 'storage' };
  readonly atlas_doc_format?: {
    readonly value: string;
    readonly representation: 'atlas_doc_format';
  };
}
