import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectTemplateResource } from '../../src/jira/resources/project-template.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type {
  ProjectTemplateModel,
  SaveTemplateResponse,
} from '../../src/jira/resources/project-template.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('ProjectTemplateResource', () => {
  let transport: MockTransport;
  let resource: ProjectTemplateResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new ProjectTemplateResource(transport, BASE_URL);
  });

  // ── createWithCustomTemplate (B653) ──────────────────────────────────────

  describe('createWithCustomTemplate()', () => {
    it('POST /project-template with full data', async () => {
      transport.respondWith(undefined);

      await resource.createWithCustomTemplate({
        details: {
          name: 'My Project',
          key: 'MP',
          description: 'A test project',
          accessLevel: 'private',
          assigneeType: 'PROJECT_LEAD',
          avatarId: 10200,
          categoryId: 10100,
          language: 'en',
          leadAccountId: '123abc',
          url: 'https://example.com',
          enableComponents: true,
          additionalProperties: { foo: 'bar' },
        },
        template: {
          project: { projectType: 'software' },
          workflow: { workflowSchemeId: 10001 },
        },
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/project-template`,
        body: {
          details: {
            name: 'My Project',
            key: 'MP',
            description: 'A test project',
            accessLevel: 'private',
            assigneeType: 'PROJECT_LEAD',
            avatarId: 10200,
            categoryId: 10100,
            language: 'en',
            leadAccountId: '123abc',
            url: 'https://example.com',
            enableComponents: true,
            additionalProperties: { foo: 'bar' },
          },
          template: {
            project: { projectType: 'software' },
            workflow: { workflowSchemeId: 10001 },
          },
        },
      });
    });

    it('POST /project-template with minimal data (empty objects)', async () => {
      transport.respondWith(undefined);

      await resource.createWithCustomTemplate({});

      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/project-template`,
        body: {},
      });
    });

    it('returns void on success', async () => {
      transport.respondWith(undefined);
      const result = await resource.createWithCustomTemplate({ details: { name: 'Test' } });
      expect(result).toBeUndefined();
    });
  });

  // ── editTemplate (B654) ──────────────────────────────────────────────────

  describe('editTemplate()', () => {
    it('PUT /project-template/edit-template with all fields', async () => {
      transport.respondWith(undefined);

      await resource.editTemplate({
        templateKey: 'my-template',
        templateName: 'New Name',
        templateDescription: 'New description',
        templateGenerationOptions: {
          enableScreenDelegatedAdminSupport: true,
          enableWorkflowDelegatedAdminSupport: false,
        },
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/project-template/edit-template`,
        body: {
          templateKey: 'my-template',
          templateName: 'New Name',
          templateDescription: 'New description',
          templateGenerationOptions: {
            enableScreenDelegatedAdminSupport: true,
            enableWorkflowDelegatedAdminSupport: false,
          },
        },
      });
    });

    it('PUT /project-template/edit-template with minimal data', async () => {
      transport.respondWith(undefined);

      await resource.editTemplate({ templateKey: 'key-only' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/project-template/edit-template`,
        body: { templateKey: 'key-only' },
      });
    });

    it('returns void on success', async () => {
      transport.respondWith(undefined);
      const result = await resource.editTemplate({ templateName: 'x' });
      expect(result).toBeUndefined();
    });
  });

  // ── getLiveTemplate (B655) ────────────────────────────────────────────────

  describe('getLiveTemplate()', () => {
    const model: ProjectTemplateModel = {
      name: 'My Template',
      description: 'desc',
      type: 'LIVE',
      projectTemplateKey: { key: 'my-template-key', uuid: 'abc-123' },
      archetype: { realType: 'SOFTWARE', style: 'next-gen', type: 'SOFTWARE' },
      templateGenerationOptions: {
        enableScreenDelegatedAdminSupport: true,
        enableWorkflowDelegatedAdminSupport: false,
      },
    };

    it('GET /project-template/live-template with projectId', async () => {
      transport.respondWith(model);

      const result = await resource.getLiveTemplate({ projectId: '10001' });

      expect(result).toEqual(model);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/project-template/live-template`,
        query: { projectId: '10001' },
      });
    });

    it('GET /project-template/live-template with templateKey', async () => {
      transport.respondWith(model);

      await resource.getLiveTemplate({ templateKey: 'my-key' });

      expect(transport.lastCall?.options.query).toMatchObject({ templateKey: 'my-key' });
    });

    it('GET /project-template/live-template with both params', async () => {
      transport.respondWith(model);

      await resource.getLiveTemplate({ projectId: '10001', templateKey: 'my-key' });

      expect(transport.lastCall?.options.query).toMatchObject({
        projectId: '10001',
        templateKey: 'my-key',
      });
    });

    it('GET /project-template/live-template with no params (empty query)', async () => {
      transport.respondWith(model);

      await resource.getLiveTemplate();

      const query = transport.lastCall?.options.query ?? {};
      expect(query['projectId']).toBeUndefined();
      expect(query['templateKey']).toBeUndefined();
    });

    it('GET /project-template/live-template with empty params object', async () => {
      transport.respondWith(model);

      await resource.getLiveTemplate({});

      const query = transport.lastCall?.options.query ?? {};
      expect(query['projectId']).toBeUndefined();
      expect(query['templateKey']).toBeUndefined();
    });
  });

  // ── removeTemplate (B656) ────────────────────────────────────────────────

  describe('removeTemplate()', () => {
    it('DELETE /project-template/remove-template with templateKey in query', async () => {
      transport.respondWith(undefined);

      await resource.removeTemplate('my-template-key');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/project-template/remove-template`,
        query: { templateKey: 'my-template-key' },
      });
    });

    it('returns void on success', async () => {
      transport.respondWith(undefined);
      const result = await resource.removeTemplate('some-key');
      expect(result).toBeUndefined();
    });
  });

  // ── saveTemplate (B657) ──────────────────────────────────────────────────

  describe('saveTemplate()', () => {
    const saveResponse: SaveTemplateResponse = {
      projectTemplateKey: { key: 'saved-template', uuid: 'def-456' },
    };

    it('POST /project-template/save-template with full data', async () => {
      transport.respondWith(saveResponse);

      const result = await resource.saveTemplate({
        templateName: 'My Snapshot',
        templateDescription: 'Snapshot desc',
        templateFromProjectRequest: {
          projectId: 10001,
          templateType: 'SNAPSHOT',
          templateGenerationOptions: {
            enableScreenDelegatedAdminSupport: false,
            enableWorkflowDelegatedAdminSupport: true,
          },
        },
      });

      expect(result).toEqual(saveResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/project-template/save-template`,
        body: {
          templateName: 'My Snapshot',
          templateDescription: 'Snapshot desc',
          templateFromProjectRequest: {
            projectId: 10001,
            templateType: 'SNAPSHOT',
            templateGenerationOptions: {
              enableScreenDelegatedAdminSupport: false,
              enableWorkflowDelegatedAdminSupport: true,
            },
          },
        },
      });
    });

    it('POST /project-template/save-template with minimal data', async () => {
      transport.respondWith(saveResponse);

      await resource.saveTemplate({ templateName: 'Minimal' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/project-template/save-template`,
        body: { templateName: 'Minimal' },
      });
    });

    it('POST /project-template/save-template with empty body', async () => {
      transport.respondWith(saveResponse);

      await resource.saveTemplate({});

      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/project-template/save-template`,
        body: {},
      });
    });

    it('POST /project-template/save-template with LIVE template type', async () => {
      transport.respondWith(saveResponse);

      await resource.saveTemplate({
        templateFromProjectRequest: { projectId: 10001, templateType: 'LIVE' },
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        templateFromProjectRequest: { projectId: 10001, templateType: 'LIVE' },
      });
    });
  });
});
