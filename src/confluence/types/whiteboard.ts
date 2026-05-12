/** Confluence Whiteboard. */
export interface Whiteboard {
  readonly id: string;
  readonly title?: string;
  readonly status?: string;
  readonly spaceId?: string;
  readonly parentId?: string;
  readonly parentType?: string;
  readonly authorId?: string;
  readonly createdAt?: string;
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
