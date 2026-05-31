import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import { ValidationError } from '../../core/errors.js';

/**
 * A Jira issue link type (e.g. "Blocks", "Clones", "Duplicate").
 *
 * `IssueLinkType` fields: id, inward, name, outward, self.
 *
 * No type-name collision found in src/jira/types.ts or src/jira/resources/*.ts
 * as of this implementation (grep confirmed empty result).
 */
export interface IssueLinkType {
  readonly id?: string;
  readonly inward?: string;
  readonly name?: string;
  readonly outward?: string;
  readonly self?: string;
}

/** Response envelope for GET /rest/api/3/issueLinkType. */
export interface IssueLinkTypes {
  readonly issueLinkTypes: IssueLinkType[];
}

/** Request body for POST /rest/api/3/issueLinkType (B534). */
export interface CreateIssueLinkTypeData {
  readonly name: string;
  readonly inward: string;
  readonly outward: string;
}

/** Request body for PUT /rest/api/3/issueLinkType/{issueLinkTypeId} (B537). */
export interface UpdateIssueLinkTypeData {
  readonly name?: string;
  readonly inward?: string;
  readonly outward?: string;
}

/**
 * Jira Issue Link Type resource — CRUD endpoints under
 * `/rest/api/3/issueLinkType` (B533-B537).
 *
 * Issue link types define the directional relationships between issues,
 * such as "Blocks" / "is blocked by", "Clones" / "is cloned by", etc.
 */
export class IssueLinkTypeResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B533: List all issue link types.
   * GET /rest/api/3/issueLinkType
   *
   * Returns the unwrapped array (the `issueLinkTypes` property of the response
   * envelope), matching the pattern of other non-paginated list endpoints
   * (e.g. `PrioritiesResource.list`, `StatusCategoryResource.list`).
   */
  async list(): Promise<IssueLinkType[]> {
    const response = await this.transport.request<IssueLinkTypes>({
      method: 'GET',
      path: `${this.baseUrl}/issueLinkType`,
    });
    return response.data.issueLinkTypes;
  }

  /**
   * B534: Create an issue link type.
   * POST /rest/api/3/issueLinkType
   *
   * `id` and `self` are server-assigned and must NOT be sent in the body.
   */
  async create(data: CreateIssueLinkTypeData): Promise<IssueLinkType> {
    const response = await this.transport.request<IssueLinkType>({
      method: 'POST',
      path: `${this.baseUrl}/issueLinkType`,
      body: {
        name: data.name,
        inward: data.inward,
        outward: data.outward,
      },
    });
    return response.data;
  }

  /**
   * B536: Get a single issue link type by ID.
   * GET /rest/api/3/issueLinkType/{issueLinkTypeId}
   */
  async get(issueLinkTypeId: string): Promise<IssueLinkType> {
    const response = await this.transport.request<IssueLinkType>({
      method: 'GET',
      path: `${this.baseUrl}/issueLinkType/${encodePathSegment(issueLinkTypeId)}`,
    });
    return response.data;
  }

  /**
   * B537: Update an issue link type.
   * PUT /rest/api/3/issueLinkType/{issueLinkTypeId}
   *
   * At least one of `name`, `inward`, or `outward` must be provided.
   */
  async update(issueLinkTypeId: string, data: UpdateIssueLinkTypeData): Promise<IssueLinkType> {
    if (data.name === undefined && data.inward === undefined && data.outward === undefined) {
      throw new ValidationError('update requires at least one of: --name, --inward, --outward');
    }
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.inward !== undefined) body['inward'] = data.inward;
    if (data.outward !== undefined) body['outward'] = data.outward;

    const response = await this.transport.request<IssueLinkType>({
      method: 'PUT',
      path: `${this.baseUrl}/issueLinkType/${encodePathSegment(issueLinkTypeId)}`,
      body,
    });
    return response.data;
  }

  /**
   * B535: Delete an issue link type.
   * DELETE /rest/api/3/issueLinkType/{issueLinkTypeId}
   */
  async delete(issueLinkTypeId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issueLinkType/${encodePathSegment(issueLinkTypeId)}`,
    });
  }
}
