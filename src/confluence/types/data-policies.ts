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
 * A space entry returned by `GET /data-policies/spaces`. All fields are
 * declared optional in the OpenAPI spec; callers should treat missing
 * properties as "not surfaced for this caller".
 */
export interface DataPolicySpace {
  readonly id?: string;
  readonly key?: string;
  readonly name?: string;
  readonly description?: Record<string, unknown>;
  readonly dataPolicy?: DataPolicySpaceFlags;
  readonly icon?: Record<string, unknown>;
  readonly _links?: Record<string, string>;
}

/**
 * Sort order tokens accepted by `/data-policies/spaces`. Mirrors the
 * `SpaceSortOrder` enum in the OpenAPI spec — `-` prefix flips direction.
 */
export type DataPolicySpaceSortOrder = 'id' | '-id' | 'key' | '-key' | 'name' | '-name';

/** Query parameters for `GET /data-policies/spaces`. */
export interface ListDataPolicySpacesParams {
  /** Filter to specific space IDs. Server caps at 250 entries. */
  readonly ids?: readonly string[];
  /** Filter to specific space keys. Server caps at 250 entries. */
  readonly keys?: readonly string[];
  /** Sort field; prefix with `-` to reverse direction. */
  readonly sort?: DataPolicySpaceSortOrder;
  /** Opaque cursor obtained from a previous page's `_links.next`. */
  readonly cursor?: string;
  /** Maximum number of spaces to return (1-250, server default 25). */
  readonly limit?: number;
}
