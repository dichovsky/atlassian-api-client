import { describe, it, expect, beforeEach } from 'vitest';
import { PostIncidentReviewsResource } from '../../src/jira/resources/post-incident-reviews.js';
import type {
  PostIncidentReview,
  PostIncidentReviewStatus,
} from '../../src/jira/resources/post-incident-reviews.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/operations/1.0';

const makeReview = (
  overrides?: Partial<{ id: string; status: PostIncidentReviewStatus; reviews: string[] }>,
): PostIncidentReview => ({
  schemaVersion: '1.0',
  id: overrides?.id ?? 'PIR-1',
  updateSequenceNumber: 1523494301448,
  summary: 'Post-mortem for INC-1',
  description: 'A description of the review.',
  url: 'https://example.com/project/PIR-1/summary',
  reviews: overrides?.reviews ?? ['INC-1'],
  createdDate: '2024-01-01T00:00:00.000Z',
  lastUpdated: '2024-06-01T00:00:00.000Z',
  status: overrides?.status ?? 'in progress',
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

    it('returns required spec fields on a review', async () => {
      // Spec requires: schemaVersion, id, updateSequenceNumber, summary,
      // description, url, reviews, createdDate, lastUpdated, status.
      const review = makeReview({ reviews: ['INC-1', 'INC-2'] });
      transport.respondWith(review);

      const result = await postIncidentReviews.get('PIR-1');

      expect(result.schemaVersion).toBe('1.0');
      expect(result.updateSequenceNumber).toBe(1523494301448);
      expect(result.summary).toBe('Post-mortem for INC-1');
      expect(result.description).toBe('A description of the review.');
      expect(result.url).toBe('https://example.com/project/PIR-1/summary');
      expect(result.reviews).toEqual(['INC-1', 'INC-2']);
      expect(result.createdDate).toBe('2024-01-01T00:00:00.000Z');
      expect(result.lastUpdated).toBe('2024-06-01T00:00:00.000Z');
      expect(result.status).toBe('in progress');
    });

    it('returns optional associations when present', async () => {
      // Spec: associations is an optional array of issueIdOrKeys/serviceIdOrKeys etc.
      const review: PostIncidentReview = {
        ...makeReview(),
        associations: [{ associationType: 'issueIdOrKeys', values: ['ITSM-123'] }],
      };
      transport.respondWith(review);

      const result = await postIncidentReviews.get('PIR-1');

      expect(result.associations).toHaveLength(1);
      expect(result.associations?.[0]?.associationType).toBe('issueIdOrKeys');
      expect(result.associations?.[0]?.values).toEqual(['ITSM-123']);
    });

    it('spec field is reviews (array of incident IDs), not incidentId or name', async () => {
      // Spec: the field is `reviews: string[]` (array of incident IDs); there
      // is no `name` field and no singular `incidentId` field.
      const review = makeReview({ reviews: ['INC-42'] });
      transport.respondWith(review);

      const result = await postIncidentReviews.get('PIR-1');

      expect(result.reviews).toEqual(['INC-42']);
      // TypeScript would catch name/incidentId/createdAt/updatedAt at compile time;
      // runtime check that they are absent from the fixture.
      expect(result).not.toHaveProperty('name');
      expect(result).not.toHaveProperty('incidentId');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
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

    it('rejects a path-traversal reviewId (B1052)', async () => {
      await expect(postIncidentReviews.get('..')).rejects.toThrow(ValidationError);
    });
  });
});
