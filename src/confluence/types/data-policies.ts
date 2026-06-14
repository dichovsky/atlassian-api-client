/**
 * Workspace-level data-policy metadata, returned by
 * `GET /data-policies/metadata`. The OpenAPI spec exposes a single
 * optional flag indicating whether any content in the workspace is
 * blocked from the requesting client app.
 */
export interface DataPolicyMetadata {
  /** Whether the workspace contains any content blocked for the caller. */
  readonly anyContentBlocked?: boolean;
}

/** Per-space data-policy block returned inside {@link DataPolicySpace}. */
export interface DataPolicySpaceFlags {
  /** Whether the space contains any content blocked for the caller. */
  readonly anyContentBlocked?: boolean;
}

/**
 * A single body representation (`plain` or `view`) returned within the
 * space description object. Mirrors the OpenAPI `BodyType` schema.
 */
export interface DataPolicyBodyType {
  /** Type of content representation used for the value field. */
  readonly representation?: string;
  /** Body of the content in the format named by `representation`. */
  readonly value?: string;
}

/**
 * Description of a space as returned inside {@link DataPolicySpace}. Contains
 * optional `plain` and `view` body representations. Mirrors the OpenAPI
 * `SpaceDescription` schema.
 */
export interface DataPolicySpaceDescription {
  readonly plain?: DataPolicyBodyType;
  readonly view?: DataPolicyBodyType;
}

/**
 * Icon of a space as returned inside {@link DataPolicySpace}. Mirrors the
 * OpenAPI `SpaceIcon` schema.
 */
export interface DataPolicySpaceIcon {
  /** Path (relative to base URL) at which the space icon can be retrieved. */
  readonly path?: string;
  /**
   * Path (relative to base URL) to retrieve a download link for the icon.
   * 3LO apps should prefer this over `path`.
   */
  readonly apiDownloadLink?: string;
}

/**
 * Links object for a space returned inside {@link DataPolicySpace}. Mirrors the
 * OpenAPI `SpaceLinks` schema.
 */
export interface DataPolicySpaceLinks {
  /** Web UI link of the space. */
  readonly webui?: string;
}

/**
 * A space entry returned by `GET /data-policies/spaces`. All fields are
 * declared optional in the OpenAPI spec; callers should treat missing
 * properties as "not surfaced for this caller".
 */
export interface DataPolicySpace {
  readonly id?: string;
  readonly key?: string;
  readonly name?: string;
  readonly description?: DataPolicySpaceDescription;
  readonly dataPolicy?: DataPolicySpaceFlags;
  readonly icon?: DataPolicySpaceIcon;
  readonly _links?: DataPolicySpaceLinks;
}

/**
 * Sort order tokens accepted by `/data-policies/spaces`. Mirrors the
 * `SpaceSortOrder` enum in the OpenAPI spec — `-` prefix flips direction.
 */
export type DataPolicySpaceSortOrder = 'id' | '-id' | 'key' | '-key' | 'name' | '-name';

/** Query parameters for `GET /data-policies/spaces`. */
export interface ListDataPolicySpacesParams {
  /**
   * Filter to specific space IDs. Server caps at 250 entries. Values are
   * `int64` integers on the wire (`type: array, items: { type: integer }`).
   */
  readonly ids?: readonly number[];
  /** Filter to specific space keys. Server caps at 250 entries. */
  readonly keys?: readonly string[];
  /** Sort field; prefix with `-` to reverse direction. */
  readonly sort?: DataPolicySpaceSortOrder;
  /** Opaque cursor obtained from a previous page's `_links.next`. */
  readonly cursor?: string;
  /** Maximum number of spaces to return (1-250, server default 25). */
  readonly limit?: number;
}
