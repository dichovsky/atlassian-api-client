import { describe, it, expect, beforeEach } from 'vitest';
import { PrioritiesResource } from '../../src/jira/resources/priorities.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makePriority = (id: string) => ({
  id,
  name: `Priority ${id}`,
  self: `${BASE_URL}/priority/${id}`,
  description: 'A test priority',
  iconUrl: `https://test.atlassian.net/images/icons/priorities/priority-${id}.svg`,
  statusColor: '#FF0000',
});

describe('PrioritiesResource', () => {
  let transport: MockTransport;
  let priorities: PrioritiesResource;

  beforeEach(() => {
    transport = new MockTransport();
    priorities = new PrioritiesResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /priority and returns the array', async () => {
      // Arrange
      const priorityList = [makePriority('1'), makePriority('2'), makePriority('3')];
      transport.respondWith(priorityList);

      // Act
      const result = await priorities.list();

      // Assert
      expect(result).toEqual(priorityList);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/priority`,
      });
    });

    it('returns an empty array when no priorities exist', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await priorities.list();

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /priority/{id} and returns the priority', async () => {
      // Arrange
      const priority = makePriority('1');
      transport.respondWith(priority);

      // Act
      const result = await priorities.get('1');

      // Assert
      expect(result).toEqual(priority);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/priority/1`,
      });
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes special characters in id for get()', async () => {
      transport.respondWith(makePriority('x'));
      await priorities.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/priority/..%2Fadmin`);
    });
  });
});
