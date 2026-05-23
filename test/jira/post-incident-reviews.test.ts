import { describe, it, expect, beforeEach } from 'vitest';
import { PostIncidentReviewsResource } from '../../src/jira/resources/post-incident-reviews.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/operations/1.0';

const makeReview = (overrides?: Partial<{ id: string; name: string; incidentId: string }>) => ({
  id: overrides?.id ?? 'PIR-1',
  name: overrides?.name ?? 'Post-mortem for INC-1',
  incidentId: overrides?.incidentId ?? 'INC-1',
  status: 'open',
});

describe('PostIncidentReviewsResource', () => {
  let transport: MockTransport;
  let postIncidentReviews: PostIncidentReviewsResource;

  beforeEach(() => {
    transport = new MockTransport();
    postIncidentReviews = new PostIncidentReviewsResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /post-incident-reviews/{id} and returns the review', async () => {
      // Arrange
      const review = makeReview();
      transport.respondWith(review);

      // Act
      const result = await postIncidentReviews.get('PIR-1');

      // Assert
      expect(result).toEqual(review);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/post-incident-reviews/PIR-1`,
      });
    });

    it('URL-encodes the reviewId', async () => {
      // Arrange
      transport.respondWith(makeReview({ id: 'PIR/special' }));

      // Act
      await postIncidentReviews.get('PIR/special');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/post-incident-reviews/PIR%2Fspecial`,
      );
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(postIncidentReviews.get('PIR-1')).rejects.toThrow('network error');
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /post-incident-reviews/{id} and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await postIncidentReviews.delete('PIR-1');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/post-incident-reviews/PIR-1`,
      });
    });

    it('URL-encodes the reviewId', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await postIncidentReviews.delete('PIR/special');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/post-incident-reviews/PIR%2Fspecial`,
      );
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(postIncidentReviews.delete('PIR-1')).rejects.toThrow('forbidden');
    });
  });
});
