import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import { ValidationError } from '../../core/errors.js';

// ── B946/B947: GET/POST /migration/{connectKey}/{jiraIssueFieldsKey}/task ────

/** Task status detail returned by GET migration task (B946). */
export interface MigrationTaskProgress {
  readonly id: string;
  readonly self: string;
  readonly status:
    | 'ENQUEUED'
    | 'RUNNING'
    | 'COMPLETE'
    | 'FAILED'
    | 'CANCEL_REQUESTED'
    | 'CANCELLED'
    | 'DEAD';
  readonly elapsedRuntime: number;
  readonly lastUpdate: string;
  readonly progress: number;
  readonly submittedBy: number;
  readonly description?: string;
  readonly finished?: string;
  readonly message?: string;
  readonly result?: unknown;
  readonly started?: string;
  readonly submitted?: string;
}

// ── B948: PUT /migration/field ────────────────────────────────────────────────

/** Discriminated union type for a Connect custom field update value (B948). */
export type ConnectCustomFieldValueType =
  | 'StringIssueField'
  | 'NumberIssueField'
  | 'RichTextIssueField'
  | 'SingleSelectIssueField'
  | 'MultiSelectIssueField'
  | 'TextIssueField';

/** A single custom field update detail (B948). */
export interface ConnectCustomFieldValue {
  readonly _type: ConnectCustomFieldValueType;
  readonly fieldID: number;
  readonly issueID: number;
  readonly number?: number;
  readonly optionID?: string;
  readonly richText?: string;
  readonly string?: string;
  readonly text?: string;
}

/** Request body for bulk update custom field values (B948). */
export interface UpdateCustomFieldValuesBody {
  readonly updateValueList?: ConnectCustomFieldValue[];
}

// ── B949: PUT /migration/properties/{entityType} ─────────────────────────────

/** Allowed entity types for migration property updates (B949). */
export type MigrationEntityType =
  | 'IssueProperty'
  | 'CommentProperty'
  | 'DashboardItemProperty'
  | 'IssueTypeProperty'
  | 'ProjectProperty'
  | 'UserProperty'
  | 'WorklogProperty'
  | 'BoardProperty'
  | 'SprintProperty';

/** A single entity property update detail (B949). */
export interface EntityPropertyDetails {
  readonly entityId: number;
  readonly key: string;
  readonly value: string;
}

// ── B950: POST /migration/workflow/rule/search ────────────────────────────────

/** Request body for workflow rule search (B950). */
export interface WorkflowRulesSearch {
  readonly workflowEntityId: string;
  readonly ruleIds: string[];
  readonly expand?: string;
}

/**
 * Configuration of a workflow transition rule (B950).
 * Spec: RuleConfiguration — value is required.
 */
export interface RuleConfiguration {
  /** Configuration value stored by the Connect or Forge app. */
  readonly value: string;
  /** Whether the rule is disabled. Defaults to false. */
  readonly disabled?: boolean;
  /** Tag used to filter rules in workflow transition rule configurations. */
  readonly tag?: string;
}

/**
 * A workflow transition detail returned with rules (B950).
 * Spec: WorkflowTransition — id (int32) and name are required.
 * Named MigrationWorkflowTransition to avoid collision with WorkflowTransition in workflows.ts.
 */
export interface MigrationWorkflowTransition {
  /** The transition ID (int32). */
  readonly id: number;
  /** The transition name. */
  readonly name: string;
}

/**
 * A single app workflow transition rule detail (B950).
 * Spec: AppWorkflowTransitionRule — configuration, id, key are required.
 */
export interface AppWorkflowTransitionRule {
  readonly id: string;
  readonly key: string;
  readonly configuration: RuleConfiguration;
  readonly transition?: MigrationWorkflowTransition;
}

/** A workflow with transition rules (B950). */
export interface WorkflowTransitionRules {
  /** Spec: WorkflowId — name is required. */
  readonly workflowId: { readonly name: string; readonly draft?: boolean };
  readonly conditions?: AppWorkflowTransitionRule[];
  readonly postFunctions?: AppWorkflowTransitionRule[];
  readonly validators?: AppWorkflowTransitionRule[];
}

/** Response from workflow rule search (B950). */
export interface WorkflowRulesSearchDetails {
  readonly workflowEntityId?: string;
  readonly invalidRules?: string[];
  readonly validRules?: WorkflowTransitionRules[];
}

/**
 * Jira Connect migration resource.
 *
 * Covers Connect-to-Forge migration endpoints and app migration helpers
 * under `/rest/atlassian-connect/1/migration` (B946–B950).
 *
 * @devnotes URL base: `/rest/atlassian-connect/1` (not `/rest/api/3`).
 *   The `Atlassian-Transfer-Id` header (UUID) is REQUIRED for B948, B949,
 *   and B950 — it identifies the migration transfer context.
 */
export class MigrationResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Get the Connect-to-Forge issue field migration task status.
   * GET /rest/atlassian-connect/1/migration/{connectKey}/{jiraIssueFieldsKey}/task
   * B946
   */
  async getMigrationTask(
    connectKey: string,
    jiraIssueFieldsKey: string,
  ): Promise<MigrationTaskProgress> {
    if (!connectKey) throw new ValidationError('connectKey is required');
    if (!jiraIssueFieldsKey) throw new ValidationError('jiraIssueFieldsKey is required');
    const response = await this.transport.request<MigrationTaskProgress>({
      method: 'GET',
      path: `${this.baseUrl}/migration/${encodePathSegment(connectKey, 'connectKey')}/${encodePathSegment(jiraIssueFieldsKey, 'jiraIssueFieldsKey')}/task`,
    });
    return response.data;
  }

  /**
   * Submit a Connect-to-Forge issue field migration task.
   * POST /rest/atlassian-connect/1/migration/{connectKey}/{jiraIssueFieldsKey}/task
   * B947 — returns void (202 Accepted)
   */
  async submitMigrationTask(connectKey: string, jiraIssueFieldsKey: string): Promise<void> {
    if (!connectKey) throw new ValidationError('connectKey is required');
    if (!jiraIssueFieldsKey) throw new ValidationError('jiraIssueFieldsKey is required');
    await this.transport.request<unknown>({
      method: 'POST',
      path: `${this.baseUrl}/migration/${encodePathSegment(connectKey, 'connectKey')}/${encodePathSegment(jiraIssueFieldsKey, 'jiraIssueFieldsKey')}/task`,
    });
  }

  /**
   * Bulk update custom field values on issues (Connect app migration).
   * PUT /rest/atlassian-connect/1/migration/field
   * B948 — requires `Atlassian-Transfer-Id` header (UUID)
   */
  async updateIssueFields(transferId: string, body: UpdateCustomFieldValuesBody): Promise<unknown> {
    if (!transferId) throw new ValidationError('transferId is required');
    const response = await this.transport.request<unknown>({
      method: 'PUT',
      path: `${this.baseUrl}/migration/field`,
      body,
      headers: { 'Atlassian-Transfer-Id': transferId },
    });
    return response.data;
  }

  /**
   * Bulk update entity properties (Connect app migration).
   * PUT /rest/atlassian-connect/1/migration/properties/{entityType}
   * B949 — requires `Atlassian-Transfer-Id` header (UUID)
   */
  async updateEntityProperties(
    transferId: string,
    entityType: MigrationEntityType,
    properties: EntityPropertyDetails[],
  ): Promise<void> {
    if (!transferId) throw new ValidationError('transferId is required');
    if (!entityType) throw new ValidationError('entityType is required');
    await this.transport.request<unknown>({
      method: 'PUT',
      path: `${this.baseUrl}/migration/properties/${encodePathSegment(entityType, 'entityType')}`,
      body: properties,
      headers: { 'Atlassian-Transfer-Id': transferId },
    });
  }

  /**
   * Search workflow transition rule configurations for migrated Connect app rules.
   * POST /rest/atlassian-connect/1/migration/workflow/rule/search
   * B950 — requires `Atlassian-Transfer-Id` header (UUID)
   */
  async searchWorkflowRules(
    transferId: string,
    body: WorkflowRulesSearch,
  ): Promise<WorkflowRulesSearchDetails> {
    if (!transferId) throw new ValidationError('transferId is required');
    if (!body.workflowEntityId) throw new ValidationError('workflowEntityId is required');
    if (!body.ruleIds || body.ruleIds.length === 0)
      throw new ValidationError('ruleIds is required');
    if (body.ruleIds.length > 10) throw new ValidationError('ruleIds accepts at most 10 rule IDs');
    const response = await this.transport.request<WorkflowRulesSearchDetails>({
      method: 'POST',
      path: `${this.baseUrl}/migration/workflow/rule/search`,
      body,
      headers: { 'Atlassian-Transfer-Id': transferId },
    });
    return response.data;
  }
}
