import { describe, it, expect, beforeEach } from 'vitest';
import { AvatarResource } from '../../src/jira/resources/avatar.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeSystemResponse = () => ({
  system: [
    { id: '1', isSystemAvatar: true, isSelected: false, isDeletable: false, fileName: 'bug.png' },
    { id: '2', isSystemAvatar: true, isSelected: true, isDeletable: false, fileName: 'task.png' },
  ],
});

describe('AvatarResource', () => {
  let transport: MockTransport;
  let avatar: AvatarResource;

  beforeEach(() => {
    transport = new MockTransport();
    avatar = new AvatarResource(transport, BASE_URL);
  });

  // ── listSystem ────────────────────────────────────────────────────────────

  describe('listSystem()', () => {
    it('calls GET /avatar/{type}/system and returns the response', async () => {
      // Arrange
      const systemResponse = makeSystemResponse();
      transport.respondWith(systemResponse);

      // Act
      const result = await avatar.listSystem('issuetype');

      // Assert
      expect(result).toEqual(systemResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/avatar/issuetype/system`,
      });
    });

    it('URL-encodes the type', async () => {
      // Arrange
      transport.respondWith(makeSystemResponse());

      // Act
      await avatar.listSystem('issue type');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/avatar/issue%20type/system`);
    });

    it('works for "project" type', async () => {
      // Arrange
      transport.respondWith(makeSystemResponse());

      // Act
      const result = await avatar.listSystem('project');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/avatar/project/system`);
      expect(result.system).toHaveLength(2);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(avatar.listSystem('issuetype')).rejects.toThrow('network error');
    });
  });
});
