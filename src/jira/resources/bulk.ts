import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

export interface BulkIssueUpdate {
  readonly fields: Record<string, unknown>;
  readonly update?: Record<string, unknown[]>;
}

export interface BulkCreatedIssue {
  readonly id: string;
  readonly key: string;
  readonly self: string;
}

export interface BulkIssueError {
  readonly status?: number;
  readonly elementErrors?: Record<string, unknown>;
  readonly failedElementNumber?: number;
}

export interface BulkCreateIssueData {
  readonly issueUpdates: BulkIssueUpdate[];
}

export interface BulkCreatedIssues {
  readonly issues: BulkCreatedIssue[];
  readonly errors?: BulkIssueError[];
}

export interface BulkSetIssuePropertyData {
  readonly value: unknown;
  readonly filter?: {
    readonly entityIds?: string[];
    readonly currentValue?: unknown;
    readonly hasProperty?: boolean;
  };
}

export interface BulkDeleteIssuePropertyData {
  readonly filter?: {
    readonly entityIds?: string[];
    readonly currentValue?: unknown;
  };
}

export class BulkResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Bulk create issues. */
  async createBulk(data: BulkCreateIssueData): Promise<BulkCreatedIssues> {
    const response = await this.transport.request<BulkCreatedIssues>({
      method: 'POST',
      path: `${this.baseUrl}/issue/bulk`,
      body: data,
    });
    return response.data;
  }

  /** Set a property on a bulk set of issues. */
  async setPropertyBulk(propertyKey: string, data: BulkSetIssuePropertyData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issue/properties/${encodePathSegment(propertyKey)}`,
      body: data,
    });
  }

  /** Delete a property from a bulk set of issues. */
  async deletePropertyBulk(propertyKey: string, data?: BulkDeleteIssuePropertyData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/properties/${encodePathSegment(propertyKey)}`,
      body: data,
    });
  }
}
