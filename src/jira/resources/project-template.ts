import type { Transport } from '../../core/types.js';

// ─── Shared sub-types ────────────────────────────────────────────────────────

/** Key/UUID pair identifying a custom project template. */
export interface ProjectTemplateKey {
  readonly key?: string;
  readonly uuid?: string;
}

/** Archetype (type + style) of a project template. */
export interface ProjectArchetype {
  readonly realType?:
    | 'BUSINESS'
    | 'SOFTWARE'
    | 'PRODUCT_DISCOVERY'
    | 'SERVICE_DESK'
    | 'CUSTOMER_SERVICE'
    | 'OPS';
  readonly style?: 'classic' | 'next-gen';
  readonly type?:
    | 'BUSINESS'
    | 'SOFTWARE'
    | 'PRODUCT_DISCOVERY'
    | 'SERVICE_DESK'
    | 'CUSTOMER_SERVICE'
    | 'OPS';
}

/**
 * Options controlling delegated-admin support when generating a template.
 * Used by edit-template, save-template and live-template responses.
 */
export interface CustomTemplateOptions {
  readonly enableScreenDelegatedAdminSupport?: boolean;
  readonly enableWorkflowDelegatedAdminSupport?: boolean;
}

// ─── Create (B653) ───────────────────────────────────────────────────────────

/** Access level for a team-managed project. */
export type ProjectAccessLevel = 'open' | 'limited' | 'private' | 'free';

/** Default assignee mode for a project. */
export type ProjectAssigneeType =
  | 'PROJECT_DEFAULT'
  | 'COMPONENT_LEAD'
  | 'PROJECT_LEAD'
  | 'UNASSIGNED';

/** Scalar project details passed in the create-with-custom-template body. */
export interface CustomTemplatesProjectDetails {
  readonly name?: string;
  readonly key?: string;
  readonly description?: string;
  readonly accessLevel?: ProjectAccessLevel;
  readonly assigneeType?: ProjectAssigneeType;
  /** int64 */
  readonly avatarId?: number;
  /** int64 */
  readonly categoryId?: number;
  readonly language?: string;
  readonly leadAccountId?: string;
  readonly url?: string;
  readonly enableComponents?: boolean;
  /** Additional project properties (string→string map). */
  readonly additionalProperties?: Record<string, string>;
}

/**
 * The deeply-nested capability object for creating a project with a custom
 * template.  Each field corresponds to one project capability (board, workflow,
 * permissions, etc.).  The spec defines 11 nested payload refs — all are
 * pass-through so we type them as `Record<string,unknown>` to avoid an
 * explosion of rarely-used intermediate types.
 */
export interface CustomTemplateRequestDTO {
  readonly boardFeatures?: Record<string, unknown>;
  readonly boards?: Record<string, unknown>;
  readonly field?: Record<string, unknown>;
  readonly issueType?: Record<string, unknown>;
  readonly notification?: Record<string, unknown>;
  readonly permissionScheme?: Record<string, unknown>;
  readonly project?: Record<string, unknown>;
  readonly role?: Record<string, unknown>;
  readonly scope?: Record<string, unknown>;
  readonly security?: Record<string, unknown>;
  readonly workflow?: Record<string, unknown>;
}

/** Full body for B653 POST /rest/api/3/project-template. */
export interface ProjectCustomTemplateCreateRequestDTO {
  readonly details?: CustomTemplatesProjectDetails;
  readonly template?: CustomTemplateRequestDTO;
}

// ─── Edit (B654) ─────────────────────────────────────────────────────────────

/** Body for B654 PUT /rest/api/3/project-template/edit-template. */
export interface EditTemplateRequest {
  readonly templateKey?: string;
  readonly templateName?: string;
  readonly templateDescription?: string;
  readonly templateGenerationOptions?: CustomTemplateOptions;
}

// ─── Live template (B655) ────────────────────────────────────────────────────

/** Query params for B655 GET /rest/api/3/project-template/live-template. */
export interface GetLiveTemplateParams {
  readonly projectId?: string;
  readonly templateKey?: string;
}

/** Response model for B655. */
export interface ProjectTemplateModel {
  readonly archetype?: ProjectArchetype;
  readonly defaultBoardView?: string;
  readonly description?: string;
  /** int64 */
  readonly liveTemplateProjectIdReference?: number;
  readonly name?: string;
  readonly projectTemplateKey?: ProjectTemplateKey;
  readonly snapshotTemplate?: Record<string, unknown>;
  readonly templateGenerationOptions?: CustomTemplateOptions;
  readonly type?: 'LIVE' | 'SNAPSHOT';
}

// ─── Save (B657) ─────────────────────────────────────────────────────────────

/** Template type for save-template. */
export type SaveTemplateType = 'LIVE' | 'SNAPSHOT';

/** Details for generating a template from an existing project. */
export interface SaveProjectTemplateRequest {
  /** int64 */
  readonly projectId?: number;
  readonly templateGenerationOptions?: CustomTemplateOptions;
  readonly templateType?: SaveTemplateType;
}

/** Body for B657 POST /rest/api/3/project-template/save-template. */
export interface SaveTemplateRequest {
  readonly templateName?: string;
  readonly templateDescription?: string;
  readonly templateFromProjectRequest?: SaveProjectTemplateRequest;
}

/** Response for B657. */
export interface SaveTemplateResponse {
  readonly projectTemplateKey?: ProjectTemplateKey;
}

// ─── Resource class ──────────────────────────────────────────────────────────

export class ProjectTemplateResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B653 POST /rest/api/3/project-template
   * Creates a project based on a custom template (async — returns 303 redirect;
   * no JSON body in 303 response per spec).
   */
  async createWithCustomTemplate(data: ProjectCustomTemplateCreateRequestDTO): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/project-template`,
      body: data,
    });
  }

  /**
   * B654 PUT /rest/api/3/project-template/edit-template
   * Edits an existing custom template. Returns 200 with no JSON body.
   */
  async editTemplate(data: EditTemplateRequest): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/project-template/edit-template`,
      body: data,
    });
  }

  /**
   * B655 GET /rest/api/3/project-template/live-template
   * Retrieves a live custom project template by templateKey or projectId.
   */
  async getLiveTemplate(params?: GetLiveTemplateParams): Promise<ProjectTemplateModel> {
    const query: Record<string, string | undefined> = {};
    if (params?.projectId !== undefined) query['projectId'] = params.projectId;
    if (params?.templateKey !== undefined) query['templateKey'] = params.templateKey;
    const response = await this.transport.request<ProjectTemplateModel>({
      method: 'GET',
      path: `${this.baseUrl}/project-template/live-template`,
      query,
    });
    return response.data;
  }

  /**
   * B656 DELETE /rest/api/3/project-template/remove-template
   * Removes a custom template by templateKey (required). Returns 200 no body.
   */
  async removeTemplate(templateKey: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/project-template/remove-template`,
      query: { templateKey },
    });
  }

  /**
   * B657 POST /rest/api/3/project-template/save-template
   * Saves a custom project template. Returns SaveTemplateResponse.
   */
  async saveTemplate(data: SaveTemplateRequest): Promise<SaveTemplateResponse> {
    const response = await this.transport.request<SaveTemplateResponse>({
      method: 'POST',
      path: `${this.baseUrl}/project-template/save-template`,
      body: data,
    });
    return response.data;
  }
}
