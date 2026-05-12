/** Sort fields accepted by `GET /spaces`. Mirrors spec `SpaceSortOrder`. */
export type SpaceSortOrder = 'id' | '-id' | 'key' | '-key' | 'name' | '-name';

/** Body representation formats accepted for a space description. */
export type SpaceDescriptionFormat = 'plain' | 'view';

/** Spec `SpaceType` enum. */
export type SpaceType =
  | 'global'
  | 'collaboration'
  | 'knowledge_base'
  | 'personal'
  | 'system'
  | 'onboarding'
  | 'xflow_sample_space';

/** Spec `SpaceStatus` enum. */
export type SpaceStatus = 'current' | 'archived';

/** Single space-description body representation entry. */
export interface SpaceDescriptionRepresentation<R extends SpaceDescriptionFormat = SpaceDescriptionFormat> {
  readonly value: string;
  readonly representation: R;
}

/** Confluence space description. Each field is present when the corresponding format was requested. */
export interface SpaceDescription {
  readonly plain?: SpaceDescriptionRepresentation<'plain'>;
  readonly view?: SpaceDescriptionRepresentation<'view'>;
}

/** Confluence space icon. */
export interface SpaceIcon {
  readonly path?: string;
  readonly apiDownloadLink?: string;
}

/** Confluence Space. Mirrors spec schemas `SpaceSingle` and `SpaceBulk`. */
export interface Space {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  /** String for backward compatibility; the spec narrows this to `SpaceType`. */
  readonly type: string;
  /** String for backward compatibility; the spec narrows this to `SpaceStatus`. */
  readonly status: string;
  /**
   * Typed description shape preferred. The legacy `Record<string, unknown>`
   * remains assignable via the intersection so callers reading arbitrary keys
   * keep working without breakage.
   */
  readonly description?: SpaceDescription & Record<string, unknown>;
  readonly icon?: SpaceIcon;
  readonly authorId?: string;
  readonly homepageId?: string;
  /** Currently active alias for a Confluence space. */
  readonly currentActiveAlias?: string;
  readonly createdAt?: string;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing Confluence spaces (spec: `GET /spaces`). */
export interface ListSpacesParams {
  readonly keys?: readonly string[];
  /** Filter by space IDs (spec param: `ids`). */
  readonly ids?: readonly string[];
  readonly type?: SpaceType | string;
  readonly status?: SpaceStatus | string;
  /** Filter by space labels. */
  readonly labels?: readonly string[];
  /** Filter to spaces favorited by the given accountId. */
  readonly 'favorited-by'?: string;
  /** Filter to spaces NOT favorited by the given accountId. */
  readonly 'not-favorited-by'?: string;
  readonly sort?: SpaceSortOrder;
  /** Format for the returned `description` field. */
  readonly 'description-format'?: SpaceDescriptionFormat;
  /** Include the space icon in the response. */
  readonly 'include-icon'?: boolean;
  readonly limit?: number;
  readonly cursor?: string;
}
