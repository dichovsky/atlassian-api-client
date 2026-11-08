import { describe, it, expect, beforeEach } from 'vitest';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';
import type { PagesResource } from '../../src/confluence/resources/pages.js';

export const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

/**
 * The seven content-permission methods every content type exposes. Typed off
 * `PagesResource` so each resource under test must match the same signatures.
 */
export type ContentPermissionsSubject = Pick<
  PagesResource,
  | 'getRestrictionState'
  | 'setRestrictionState'
  | 'listPermissions'
  | 'listPermissionsAll'
  | 'addPermissions'
  | 'setPermissions'
  | 'deletePermissions'
>;

const permissionsBody = {
  permissions: [
    {
      operation: 'read' as const,
      principals: [{ principalType: 'user' as const, principalId: 'acc-1' }],
    },
  ],
};

const permissionsResponse = {
  results: [
    {
      operation: 'read',
      principal: { principalType: 'user', principalId: 'acc-1' },
      createdAt: '2026-11-08T00:00:00.000Z',
    },
  ],
  _links: {},
};

/**
 * Register the restriction-state and direct-permission tests for one content
 * type. `collection` is the v2 path segment (`pages`, `blogposts`, ...).
 */
export function describeContentPermissions(
  label: string,
  collection: string,
  create: (transport: MockTransport) => ContentPermissionsSubject,
): void {
  describe(`${label} restriction state and direct permissions`, () => {
    let transport: MockTransport;
    let subject: ContentPermissionsSubject;
    const base = `${BASE_URL}/${collection}/42`;

    beforeEach(() => {
      transport = new MockTransport();
      subject = create(transport);
    });

    describe('getRestrictionState()', () => {
      it('issues GET /{id}/restriction-state and returns the body', async () => {
        transport.respondWith({ state: 'EDIT_RESTRICTED', createdBy: 'acc-1' });

        const result = await subject.getRestrictionState('42');

        expect(result).toEqual({ state: 'EDIT_RESTRICTED', createdBy: 'acc-1' });
        expect(transport.lastCall?.options).toMatchObject({
          method: 'GET',
          path: `${base}/restriction-state`,
        });
        expect(transport.lastCall?.options.body).toBeUndefined();
      });

      it('percent-encodes the id and rejects dot segments', async () => {
        transport.respondWith({ state: 'OPEN' });

        await subject.getRestrictionState('a/b');

        expect(transport.lastCall?.options.path).toBe(
          `${BASE_URL}/${collection}/a%2Fb/restriction-state`,
        );
        await expect(subject.getRestrictionState('..')).rejects.toThrow(ValidationError);
      });
    });

    describe('setRestrictionState()', () => {
      it('issues PUT /{id}/restriction-state with the body and no allow-self-lockout by default', async () => {
        transport.respondWith({ state: 'VIEW_RESTRICTED' });

        const result = await subject.setRestrictionState('42', { state: 'VIEW_RESTRICTED' });

        expect(result).toEqual({ state: 'VIEW_RESTRICTED' });
        expect(transport.lastCall?.options).toMatchObject({
          method: 'PUT',
          path: `${base}/restriction-state`,
          body: { state: 'VIEW_RESTRICTED' },
        });
        expect(transport.lastCall?.options.query).toEqual({});
      });

      it('forwards allow-self-lockout only when explicitly set (true and false)', async () => {
        transport.respondWith({ state: 'OPEN' }).respondWith({ state: 'OPEN' });

        await subject.setRestrictionState('42', { state: 'OPEN' }, { 'allow-self-lockout': true });
        expect(transport.lastCall?.options.query).toEqual({ 'allow-self-lockout': true });

        await subject.setRestrictionState('42', { state: 'OPEN' }, { 'allow-self-lockout': false });
        expect(transport.lastCall?.options.query).toEqual({ 'allow-self-lockout': false });
      });
    });

    describe('listPermissions()', () => {
      it('issues GET /{id}/permissions with an empty query by default', async () => {
        transport.respondWith(permissionsResponse);

        const result = await subject.listPermissions('42');

        expect(result).toEqual(permissionsResponse);
        expect(transport.lastCall?.options).toMatchObject({
          method: 'GET',
          path: `${base}/permissions`,
        });
        expect(transport.lastCall?.options.query).toEqual({});
      });

      it('passes operation, principal filters, cursor and limit through', async () => {
        transport.respondWith(permissionsResponse);

        await subject.listPermissions('42', {
          operation: 'update',
          'principal-type': 'group',
          'principal-id': 'grp-1',
          cursor: 'tok',
          limit: 250,
        });

        expect(transport.lastCall?.options.query).toEqual({
          operation: 'update',
          'principal-type': 'group',
          'principal-id': 'grp-1',
          cursor: 'tok',
          limit: 250,
        });
      });

      it('rejects an invalid limit before any request', async () => {
        await expect(subject.listPermissions('42', { limit: 0 })).rejects.toThrow(ValidationError);
        expect(transport.calls).toHaveLength(0);
      });
    });

    describe('listPermissionsAll()', () => {
      it('follows _links.next cursors and re-sends the filters', async () => {
        transport
          .respondWith({
            results: [permissionsResponse.results[0]],
            _links: { next: `/wiki/api/v2/${collection}/42/permissions?cursor=c2` },
          })
          .respondWith({ results: [permissionsResponse.results[0]], _links: {} });

        const seen: unknown[] = [];
        for await (const entry of subject.listPermissionsAll('42', {
          operation: 'read',
          'principal-type': 'user',
          'principal-id': 'acc-1',
          limit: 1,
        })) {
          seen.push(entry);
        }

        expect(seen).toHaveLength(2);
        expect(transport.calls).toHaveLength(2);
        expect(transport.calls[0]?.options).toMatchObject({
          method: 'GET',
          path: `${base}/permissions`,
        });
        expect(transport.calls[0]?.options.query).toEqual({
          operation: 'read',
          'principal-type': 'user',
          'principal-id': 'acc-1',
          limit: 1,
        });
        expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'c2', limit: 1 });
      });

      it('sends an empty query without params and rejects an invalid limit', async () => {
        transport.respondWith({ results: [], _links: {} });

        const seen: unknown[] = [];
        for await (const entry of subject.listPermissionsAll('42')) seen.push(entry);

        expect(seen).toEqual([]);
        expect(transport.lastCall?.options.query).toEqual({});
        await expect(subject.listPermissionsAll('42', { limit: -1 }).next()).rejects.toThrow(
          ValidationError,
        );
      });
    });

    describe.each([
      ['addPermissions', 'POST'],
      ['setPermissions', 'PUT'],
    ] as const)('%s()', (method, verb) => {
      it(`issues ${verb} /{id}/permissions with the body and no allow-self-lockout by default`, async () => {
        transport.respondWith(permissionsResponse);

        const result = await subject[method]('42', permissionsBody);

        expect(result).toEqual(permissionsResponse);
        expect(transport.lastCall?.options).toMatchObject({
          method: verb,
          path: `${base}/permissions`,
          body: permissionsBody,
        });
        expect(transport.lastCall?.options.query).toEqual({});
      });

      it('forwards allow-self-lockout when explicitly set', async () => {
        transport.respondWith(permissionsResponse);

        await subject[method]('42', permissionsBody, { 'allow-self-lockout': true });

        expect(transport.lastCall?.options.query).toEqual({ 'allow-self-lockout': true });
      });
    });

    describe('deletePermissions()', () => {
      it('issues DELETE /{id}/permissions with an empty query when called without filters', async () => {
        transport.respondWith(undefined, 204);

        await expect(subject.deletePermissions('42')).resolves.toBeUndefined();

        expect(transport.lastCall?.options).toMatchObject({
          method: 'DELETE',
          path: `${base}/permissions`,
        });
        expect(transport.lastCall?.options.query).toEqual({});
      });

      it('sends the principal filters and allow-self-lockout when set', async () => {
        transport.respondWith(undefined, 204);

        await subject.deletePermissions('42', {
          operation: 'read',
          'principal-type': 'user',
          'principal-id': 'acc-1',
          'allow-self-lockout': true,
        });

        expect(transport.lastCall?.options.query).toEqual({
          operation: 'read',
          'principal-type': 'user',
          'principal-id': 'acc-1',
          'allow-self-lockout': true,
        });
      });
    });
  });
}
