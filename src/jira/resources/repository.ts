import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import { ValidationError } from '../../core/errors.js';

/**
 * A commit entity within a repository.
 */
export interface RepositoryCommit {
  readonly id?: string;
  readonly issueKeys?: readonly string[];
  readonly updateSequenceId?: number;
  readonly hash?: string;
  readonly message?: string;
  readonly authorTimestamp?: string;
  readonly displayId?: string;
  readonly url?: string;
  readonly fileCount?: number;
}

/**
 * A branch entity within a repository.
 */
export interface RepositoryBranch {
  readonly id?: string;
  readonly issueKeys?: readonly string[];
  readonly updateSequenceId?: number;
  readonly name?: string;
  readonly url?: string;
  readonly createPullRequestUrl?: string;
}

/**
 * A pull request entity within a repository.
 */
export interface RepositoryPullRequest {
  readonly id?: string;
  readonly issueKeys?: readonly string[];
  readonly updateSequenceId?: number;
  readonly status?: string;
  readonly title?: string;
  readonly url?: string;
  readonly displayId?: string;
  readonly sourceBranch?: string;
  readonly destinationBranch?: string;
  readonly lastUpdate?: string;
}

/**
 * A repository entity returned by GET /rest/devinfo/0.10/repository/{repositoryId}.
 */
export interface Repository {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly forkOf?: string;
  readonly url?: string;
  readonly avatar?: string;
  readonly avatarDescription?: string;
  readonly updateSequenceId?: number;
  readonly commits?: readonly RepositoryCommit[];
  readonly branches?: readonly RepositoryBranch[];
  readonly pullRequests?: readonly RepositoryPullRequest[];
}

/**
 * Optional query parameters for delete operations that support sequential update
 * ordering.
 */
export interface DeleteRepositoryParams {
  /**
   * Optional update sequence ID used to validate sequential updates.
   * Only deletes with an `_updateSequenceId` >= this value will be processed.
   */
  readonly updateSequenceId?: number;
}

/**
 * Jira DevInfo Repository resource — GET and DELETE /rest/devinfo/0.10/repository/{repositoryId},
 * and DELETE /rest/devinfo/0.10/repository/{repositoryId}/{entityType}/{entityId}.
 *
 * @devnotes URL base: `/rest/devinfo/0.10` (not `/rest/api/3`).
 *   This is the Jira Development Information (DevInfo) API.
 *   Used to retrieve and delete repository dev-info entities.
 */
export class RepositoryResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Build the optional `_updateSequenceId` query, validating it is a non-negative integer.
   * Guards the public API boundary against `NaN`, floats, and negative values.
   */
  private buildUpdateSequenceIdQuery(params?: DeleteRepositoryParams): Record<string, string> {
    const query: Record<string, string> = {};
    if (params?.updateSequenceId !== undefined) {
      const value = params.updateSequenceId;
      if (!Number.isInteger(value) || value < 0) {
        throw new ValidationError('updateSequenceId must be a non-negative integer');
      }
      query['_updateSequenceId'] = String(value);
    }
    return query;
  }

  /**
   * Get a repository by ID, including its commits, branches, and pull requests.
   * GET /rest/devinfo/0.10/repository/{repositoryId}
   */
  async get(repositoryId: string): Promise<Repository> {
    if (!repositoryId) throw new ValidationError('repositoryId is required');
    const response = await this.transport.request<Repository>({
      method: 'GET',
      path: `${this.baseUrl}/repository/${encodePathSegment(repositoryId, 'repositoryId')}`,
    });
    return response.data;
  }

  /**
   * Delete a repository and all its associated dev-info entities by repository ID.
   * DELETE /rest/devinfo/0.10/repository/{repositoryId}
   *
   * @param repositoryId - The ID of the repository to delete.
   * @param params - Optional `_updateSequenceId` query parameter.
   */
  async delete(repositoryId: string, params?: DeleteRepositoryParams): Promise<void> {
    if (!repositoryId) throw new ValidationError('repositoryId is required');
    const query = this.buildUpdateSequenceIdQuery(params);
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/repository/${encodePathSegment(repositoryId, 'repositoryId')}`,
      query,
    });
  }

  /**
   * Delete a specific dev-info entity (commit, branch, pull request) from a repository.
   * DELETE /rest/devinfo/0.10/repository/{repositoryId}/{entityType}/{entityId}
   *
   * @param repositoryId - The ID of the repository.
   * @param entityType - The type of entity (e.g. `commit`, `branch`, `pullRequest`).
   * @param entityId - The ID of the entity to delete.
   * @param params - Optional `_updateSequenceId` query parameter.
   */
  async deleteEntity(
    repositoryId: string,
    entityType: string,
    entityId: string,
    params?: DeleteRepositoryParams,
  ): Promise<void> {
    if (!repositoryId) throw new ValidationError('repositoryId is required');
    if (!entityType) throw new ValidationError('entityType is required');
    if (!entityId) throw new ValidationError('entityId is required');
    const query = this.buildUpdateSequenceIdQuery(params);
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/repository/${encodePathSegment(repositoryId, 'repositoryId')}/${encodePathSegment(entityType, 'entityType')}/${encodePathSegment(entityId, 'entityId')}`,
      query,
    });
  }
}
