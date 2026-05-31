import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { Avatar } from './avatar.js';

// Re-export Avatar so consumers of this module only need one import.
export type { Avatar };

/**
 * Collection of system and custom avatars for a project, issue type, or
 * priority. Mirrors `Avatars` in the Jira REST v3 OpenAPI spec.
 */
export interface Avatars {
  readonly system: Avatar[];
  readonly custom: Avatar[];
}

/**
 * Query params for {@link UniversalAvatarResource.storeAvatar} crop region.
 * `size` is required; `x` and `y` default to 0 on the server side.
 */
export interface StoreAvatarParams {
  /** The length (px) of each side of the crop region. Required. */
  readonly size: number;
  /** X coordinate of the top-left corner of the crop region. */
  readonly x?: number;
  /** Y coordinate of the top-left corner of the crop region. */
  readonly y?: number;
}

/** Valid values for the `type` path parameter across the universal-avatar surface. */
export type AvatarEntityType = 'project' | 'issuetype' | 'priority';

/** Valid values for the `size` query parameter on image-view endpoints. */
export type AvatarViewSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';

/** Valid values for the `format` query parameter on image-view endpoints. */
export type AvatarViewFormat = 'png' | 'svg';

/** Optional query params for the three avatar-image-view endpoints. */
export interface GetAvatarImageParams {
  /** Desired render size. Server uses its default when omitted. */
  readonly size?: AvatarViewSize;
  /** Desired image format. Server returns the original format when omitted. */
  readonly format?: AvatarViewFormat;
}

function asAvatarEntityType(value: string): AvatarEntityType {
  if (value === 'project' || value === 'issuetype' || value === 'priority') {
    return value;
  }
  throw new ValidationError(`type must be one of: project, issuetype, priority. Got: ${value}`);
}

function asAvatarViewSize(value: string): AvatarViewSize {
  if (
    value === 'xsmall' ||
    value === 'small' ||
    value === 'medium' ||
    value === 'large' ||
    value === 'xlarge'
  ) {
    return value;
  }
  throw new ValidationError(
    `size must be one of: xsmall, small, medium, large, xlarge. Got: ${value}`,
  );
}

function asAvatarViewFormat(value: string): AvatarViewFormat {
  if (value === 'png' || value === 'svg') return value;
  throw new ValidationError(`format must be one of: png, svg. Got: ${value}`);
}

/**
 * Jira Universal Avatar resource — manage and view avatars for projects,
 * issue types, and priorities via `/rest/api/3/universal_avatar`.
 *
 * Covers B791–B796.
 */
export class UniversalAvatarResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Get system and custom avatars for a project, issue type, or priority.
   *
   * B791 — `GET /rest/api/3/universal_avatar/type/{type}/owner/{entityId}`
   * @param type - Avatar entity type (`project`, `issuetype`, `priority`).
   * @param entityId - ID of the owning entity.
   */
  async getAvatars(type: AvatarEntityType, entityId: string): Promise<Avatars> {
    asAvatarEntityType(type); // validate
    const response = await this.transport.request<Avatars>({
      method: 'GET',
      path: `${this.baseUrl}/universal_avatar/type/${encodePathSegment(type)}/owner/${encodePathSegment(entityId)}`,
    });
    return response.data;
  }

  /**
   * Upload a custom avatar for a project, issue type, or priority.
   *
   * The image bytes are sent as a raw binary request body with content-type
   * `image/*` (NOT multipart/FormData). The `size` crop parameter is required;
   * `x` and `y` default to 0.
   *
   * B792 — POST /rest/api/3/universal_avatar/type/{type}/owner/{entityId}
   * @param type - Avatar entity type.
   * @param entityId - ID of the owning entity.
   * @param content - Raw image bytes as a `Blob`.
   * @param params - Crop params: required `size`; optional `x`, `y`.
   */
  async storeAvatar(
    type: AvatarEntityType,
    entityId: string,
    content: Blob,
    params: StoreAvatarParams,
  ): Promise<Avatar> {
    asAvatarEntityType(type); // validate
    if (!Number.isInteger(params.size) || params.size <= 0) {
      throw new ValidationError('size must be a positive integer');
    }
    const query: Record<string, string | number> = { size: params.size };
    if (params.x !== undefined) {
      if (!Number.isInteger(params.x) || params.x < 0) {
        throw new ValidationError('x must be a non-negative integer');
      }
      query['x'] = params.x;
    }
    if (params.y !== undefined) {
      if (!Number.isInteger(params.y) || params.y < 0) {
        throw new ValidationError('y must be a non-negative integer');
      }
      query['y'] = params.y;
    }

    const response = await this.transport.request<Avatar>({
      method: 'POST',
      path: `${this.baseUrl}/universal_avatar/type/${encodePathSegment(type)}/owner/${encodePathSegment(entityId)}`,
      query,
      binaryBody: content,
      headers: { 'X-Atlassian-Token': 'no-check' },
    });
    return response.data;
  }

  /**
   * Delete a custom avatar for a project, issue type, or priority.
   *
   * B793 — `DELETE /rest/api/3/universal_avatar/type/{type}/owner/{owningObjectId}/avatar/{id}`
   * @param type - Avatar entity type.
   * @param owningObjectId - ID of the owning entity.
   * @param id - Numeric avatar ID.
   */
  async deleteAvatar(type: AvatarEntityType, owningObjectId: string, id: number): Promise<void> {
    asAvatarEntityType(type); // validate
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/universal_avatar/type/${encodePathSegment(type)}/owner/${encodePathSegment(owningObjectId)}/avatar/${encodePathSegment(String(id))}`,
    });
  }

  /**
   * Get the default avatar image for a given entity type.
   *
   * Returns binary image bytes (`ArrayBuffer`). Mirror of
   * {@link IssueAttachmentsResource.downloadContent}.
   *
   * B794 — `GET /rest/api/3/universal_avatar/view/type/{type}`
   * @param type - Avatar icon type (`issuetype`, `project`, `priority`).
   * @param params - Optional `size` and `format` query params.
   */
  async getAvatarImageByType(
    type: AvatarEntityType,
    params?: GetAvatarImageParams,
  ): Promise<ArrayBuffer> {
    asAvatarEntityType(type); // validate
    const query: Record<string, string> = {};
    if (params?.size !== undefined) {
      asAvatarViewSize(params.size); // validate
      query.size = params.size;
    }
    if (params?.format !== undefined) {
      asAvatarViewFormat(params.format); // validate
      query.format = params.format;
    }
    const response = await this.transport.request<ArrayBuffer>({
      method: 'GET',
      path: `${this.baseUrl}/universal_avatar/view/type/${encodePathSegment(type)}`,
      ...(Object.keys(query).length > 0 && { query }),
      responseType: 'arrayBuffer',
    });
    return response.data;
  }

  /**
   * Get an avatar image by ID for a given entity type.
   *
   * Returns binary image bytes (`ArrayBuffer`).
   *
   * B795 — `GET /rest/api/3/universal_avatar/view/type/{type}/avatar/{id}`
   * @param type - Avatar icon type.
   * @param id - Numeric avatar ID.
   * @param params - Optional `size` and `format` query params.
   */
  async getAvatarImageByID(
    type: AvatarEntityType,
    id: number,
    params?: GetAvatarImageParams,
  ): Promise<ArrayBuffer> {
    asAvatarEntityType(type); // validate
    const query: Record<string, string> = {};
    if (params?.size !== undefined) {
      asAvatarViewSize(params.size); // validate
      query.size = params.size;
    }
    if (params?.format !== undefined) {
      asAvatarViewFormat(params.format); // validate
      query.format = params.format;
    }
    const response = await this.transport.request<ArrayBuffer>({
      method: 'GET',
      path: `${this.baseUrl}/universal_avatar/view/type/${encodePathSegment(type)}/avatar/${encodePathSegment(String(id))}`,
      ...(Object.keys(query).length > 0 && { query }),
      responseType: 'arrayBuffer',
    });
    return response.data;
  }

  /**
   * Get the avatar image for a specific owner entity (by entityId).
   *
   * Returns binary image bytes (`ArrayBuffer`).
   *
   * B796 — `GET /rest/api/3/universal_avatar/view/type/{type}/owner/{entityId}`
   * @param type - Avatar icon type.
   * @param entityId - ID of the owning entity.
   * @param params - Optional `size` and `format` query params.
   */
  async getAvatarImageByOwner(
    type: AvatarEntityType,
    entityId: string,
    params?: GetAvatarImageParams,
  ): Promise<ArrayBuffer> {
    asAvatarEntityType(type); // validate
    const query: Record<string, string> = {};
    if (params?.size !== undefined) {
      asAvatarViewSize(params.size); // validate
      query.size = params.size;
    }
    if (params?.format !== undefined) {
      asAvatarViewFormat(params.format); // validate
      query.format = params.format;
    }
    const response = await this.transport.request<ArrayBuffer>({
      method: 'GET',
      path: `${this.baseUrl}/universal_avatar/view/type/${encodePathSegment(type)}/owner/${encodePathSegment(entityId)}`,
      ...(Object.keys(query).length > 0 && { query }),
      responseType: 'arrayBuffer',
    });
    return response.data;
  }
}
