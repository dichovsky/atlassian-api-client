/** Version metadata embedded inside Confluence content responses. */
export interface ConfluenceVersion {
  readonly number: number;
  readonly message?: string;
  readonly createdAt?: string;
}

/**
 * All body representation formats accepted by the Confluence v2 spec.
 *
 * Sourced from `BodyRepresentation` family of enums in the OpenAPI document:
 * `PrimaryBodyRepresentation`, `PrimaryBodyRepresentationSingle`,
 * `CustomContentBodyRepresentation`, and `CustomContentBodyRepresentationSingle`.
 * Not every endpoint accepts every value — see the spec for the per-endpoint
 * subset.
 */
export type BodyFormat =
  | 'storage'
  | 'atlas_doc_format'
  | 'view'
  | 'raw'
  | 'export_view'
  | 'anonymous_export_view'
  | 'styled_view'
  | 'editor';

/** A single body representation entry as returned by the spec `BodyType` schema. */
export interface BodyRepresentation<R extends BodyFormat = BodyFormat> {
  readonly value: string;
  readonly representation: R;
}

/**
 * Confluence content body. Each optional field corresponds to a representation
 * format requested via the `body-format` query parameter. Endpoints return only
 * the representations they support, so all fields are optional.
 */
export interface ContentBody {
  readonly storage?: BodyRepresentation<'storage'>;
  readonly atlas_doc_format?: BodyRepresentation<'atlas_doc_format'>;
  readonly view?: BodyRepresentation<'view'>;
  readonly raw?: BodyRepresentation<'raw'>;
  readonly export_view?: BodyRepresentation<'export_view'>;
  readonly anonymous_export_view?: BodyRepresentation<'anonymous_export_view'>;
  readonly styled_view?: BodyRepresentation<'styled_view'>;
  readonly editor?: BodyRepresentation<'editor'>;
}
