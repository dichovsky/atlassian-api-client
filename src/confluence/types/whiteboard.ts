import type { ConfluenceVersion } from './body.js';
import type { ParentContentType } from './page.js';

/** Confluence Whiteboard. Mirrors spec `WhiteboardSingle`. */
export interface Whiteboard {
  readonly id: string;
  readonly type?: string;
  readonly title?: string;
  readonly status?: string;
  readonly spaceId?: string;
  readonly parentId?: string;
  readonly parentType?: ParentContentType;
  readonly ownerId?: string | null;
  readonly authorId?: string;
  readonly position?: number | null;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly _links?: Record<string, string>;
}

/** Request body for creating a whiteboard. */
export interface CreateWhiteboardData {
  readonly spaceId: string;
  readonly title?: string;
  readonly parentId?: string;
  readonly templateKey?: string;
  readonly locale?: string;
}
