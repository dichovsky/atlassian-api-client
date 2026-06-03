import type { ContentSortOrder } from './common.js';

/**
 * Allowed values for `WhiteboardCreateRequest.templateKey`.
 * Mirrors the closed enum (53 values) in the Confluence v2 OpenAPI spec.
 */
export type WhiteboardTemplateKey =
  | '2x2-prioritization'
  | '4ls-retro'
  | 'annual-calendar'
  | 'brainwriting'
  | 'concept-map'
  | 'crazy-8s'
  | 'daily-sync'
  | 'disruptive-brainstorm'
  | 'dot-voting'
  | 'elevator-pitch'
  | 'flow-chart'
  | 'gap-analysis'
  | 'ice-breakers'
  | 'incident-postmortem'
  | 'journey-mapping-kit'
  | 'kanban-board'
  | 'lean-coffee'
  | 'network-of-teams'
  | 'org-chart'
  | 'pi-planning'
  | 'prioritization'
  | 'prioritization-experiment'
  | 'product-roadmap'
  | 'product-vision-board'
  | 'rice'
  | 'sailboat-retro'
  | 'service-blueprint'
  | 'simple-retrospective'
  | 'sprint-planning'
  | 'sticky-note-pack'
  | 'swimlanes'
  | 'team-formation-guide'
  | 'timeline'
  | 'timeline-workflow'
  | 'user-story-map'
  | 'workflow'
  | 'vision-board'
  | 'venn-diagram'
  | 'storyboard'
  | 'action-plan'
  | 'root-cause-analysis'
  | 'executive-summary'
  | 'stakeholder-mapping'
  | 'annual-calendar-2025-2026'
  | 'health-monitor'
  | 'okr-planning'
  | 'swot-analysis'
  | 'poker-planning'
  | 'fishbone-diagram'
  | 'risk-assessment'
  | 'bounded-context'
  | 'hopes-and-fears'
  | 'swimlane-vertical';

/**
 * Allowed values for `WhiteboardCreateRequest.locale`.
 * Mirrors the closed enum (21 values) in the Confluence v2 OpenAPI spec.
 */
export type WhiteboardLocale =
  | 'de-DE'
  | 'cs-CZ'
  | 'ko-KR'
  | 'fr-FR'
  | 'it-IT'
  | 'ja-JP'
  | 'nl-NL'
  | 'nb-NO'
  | 'da-DK'
  | 'sv-SE'
  | 'fi-FI'
  | 'ru-RU'
  | 'pl-PL'
  | 'tr-TR'
  | 'hu-HU'
  | 'en-GB'
  | 'en-US'
  | 'pt-BR'
  | 'zh-CN'
  | 'zh-TW'
  | 'es-ES';

/**
 * Version metadata returned on a `WhiteboardSingle` response.
 * Matches the `Version` schema in the Confluence v2 OpenAPI spec.
 */
export interface WhiteboardVersion {
  readonly createdAt?: string;
  readonly message?: string;
  readonly number?: number;
  readonly minorEdit?: boolean;
  readonly authorId?: string;
}

/**
 * Confluence Whiteboard — matches the `WhiteboardSingle` schema in
 * the Confluence v2 OpenAPI spec.
 */
export interface Whiteboard {
  readonly id: string;
  readonly type?: string;
  readonly status?: string;
  readonly title?: string;
  readonly parentId?: string;
  readonly parentType?: 'page' | 'whiteboard' | 'database' | 'embed' | 'folder';
  readonly position?: number | null;
  readonly authorId?: string;
  readonly ownerId?: string;
  readonly createdAt?: string;
  readonly spaceId?: string;
  readonly version?: WhiteboardVersion;
  readonly _links?: Record<string, string>;
}

/** Request body for creating a whiteboard. */
export interface CreateWhiteboardData {
  readonly spaceId: string;
  readonly title?: string;
  readonly parentId?: string;
  readonly templateKey?: WhiteboardTemplateKey;
  readonly locale?: WhiteboardLocale;
}

/** Query parameters for `POST /whiteboards`. */
export interface CreateWhiteboardParams {
  /** Create a private whiteboard visible only to the creator. */
  readonly private?: boolean;
}

/** Query parameters for `GET /whiteboards/{id}`. */
export interface GetWhiteboardParams {
  readonly 'include-collaborators'?: boolean;
  readonly 'include-direct-children'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-properties'?: boolean;
}

/** Single ancestor entry returned by `GET /whiteboards/{id}/ancestors`. */
export interface WhiteboardAncestor {
  readonly id: string;
  readonly type?: 'page' | 'whiteboard' | 'database' | 'embed' | 'folder';
}

/** Parameters for listing whiteboard ancestors. */
export interface ListWhiteboardAncestorsParams {
  readonly limit?: number;
}

/**
 * Response shape for `GET /whiteboards/{id}/ancestors`.
 *
 * Like databases, the endpoint returns a wrapped `{ results }` object
 * **without** the `_links.next` cursor — additional pages are fetched by
 * re-calling with the highest ancestor's ID rather than a cursor token.
 */
export interface WhiteboardAncestorsResponse {
  readonly results: readonly WhiteboardAncestor[];
}

/** Descendant entry returned by `GET /whiteboards/{id}/descendants`. */
export interface WhiteboardDescendant {
  readonly id: string;
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly type?: string;
  readonly parentId?: string;
  readonly depth?: number;
  readonly childPosition?: number;
}

/** Parameters for listing whiteboard descendants. */
export interface ListWhiteboardDescendantsParams {
  readonly limit?: number;
  readonly depth?: number;
  readonly cursor?: string;
}

/** Direct child entry returned by `GET /whiteboards/{id}/direct-children`. */
export interface WhiteboardChild {
  readonly id: string;
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly type?: string;
  readonly spaceId?: string;
  readonly childPosition?: number;
}

/** Parameters for listing direct children of a whiteboard. */
export interface ListWhiteboardChildrenParams {
  readonly limit?: number;
  readonly cursor?: string;
  /**
   * Sort order. Whiteboards reuse the same `ContentSortOrder` vocabulary as
   * `/databases/{id}/direct-children`.
   */
  readonly sort?: ContentSortOrder;
}

/** Permitted operation entry returned by `GET /whiteboards/{id}/operations`. */
export interface WhiteboardOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Response shape for `GET /whiteboards/{id}/operations`. */
export interface WhiteboardOperationsResponse {
  readonly operations?: readonly WhiteboardOperation[];
}

/**
 * Request body for `PUT /whiteboards/{id}/classification-level`.
 *
 * `id` is the classification level being applied and `status` must always
 * be `"current"` (the only value the server accepts).
 */
export interface UpdateWhiteboardClassificationLevelData {
  readonly id: string;
  readonly status: 'current';
}

/**
 * Request body for `POST /whiteboards/{id}/classification-level/reset`.
 *
 * Only `status: "current"` is required by the server; the request signals
 * that the whiteboard should fall back to the space-level default
 * classification.
 */
export interface ResetWhiteboardClassificationLevelData {
  readonly status: 'current';
}
