import { describe, it, expect, beforeEach } from 'vitest';
import { ConfluenceClient } from '../../src/confluence/client.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';
import { PagesResource } from '../../src/confluence/resources/pages.js';
import { SpacesResource } from '../../src/confluence/resources/spaces.js';
import { BlogPostsResource } from '../../src/confluence/resources/blog-posts.js';
import { CommentsResource } from '../../src/confluence/resources/comments.js';
import { AttachmentsResource } from '../../src/confluence/resources/attachments.js';
import { LabelsResource } from '../../src/confluence/resources/labels.js';

const VALID_CONFIG = {
  baseUrl: 'https://test.atlassian.net',
  auth: { type: 'basic' as const, email: 'user@example.com', apiToken: 'token123' },
};

describe('ConfluenceClient', () => {
  describe('constructor', () => {
    it('creates a client with valid basic auth config', () => {
      const client = new ConfluenceClient(VALID_CONFIG);
      expect(client).toBeInstanceOf(ConfluenceClient);
    });

    it('creates a client with valid bearer auth config', () => {
      const client = new ConfluenceClient({
        baseUrl: 'https://test.atlassian.net',
        auth: { type: 'bearer', token: 'my-pat-token' },
      });
      expect(client).toBeInstanceOf(ConfluenceClient);
    });

    it('uses a custom transport when provided', () => {
      const transport = new MockTransport();
      const client = new ConfluenceClient({ ...VALID_CONFIG, transport });
      // Queue a response so the transport can be exercised
      transport.respondWith({ results: [], _links: {} });
      expect(client.pages).toBeInstanceOf(PagesResource);
    });

    it('throws ValidationError when baseUrl is missing', () => {
      expect(() => new ConfluenceClient({ ...VALID_CONFIG, baseUrl: '' })).toThrow(ValidationError);
    });

    it('throws ValidationError when baseUrl is not a valid URL', () => {
      expect(() => new ConfluenceClient({ ...VALID_CONFIG, baseUrl: 'not-a-url' })).toThrow(
        ValidationError,
      );
    });

    it('throws ValidationError when auth is missing', () => {
      expect(
        // @ts-expect-error intentionally missing auth
        () => new ConfluenceClient({ baseUrl: 'https://test.atlassian.net', auth: null }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when basic auth email is missing', () => {
      expect(
        () =>
          new ConfluenceClient({
            ...VALID_CONFIG,
            auth: { type: 'basic', email: '', apiToken: 'token' },
          }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when basic auth apiToken is missing', () => {
      expect(
        () =>
          new ConfluenceClient({
            ...VALID_CONFIG,
            auth: { type: 'basic', email: 'user@example.com', apiToken: '' },
          }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when bearer token is missing', () => {
      expect(
        () =>
          new ConfluenceClient({
            ...VALID_CONFIG,
            auth: { type: 'bearer', token: '' },
          }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError for unsupported auth type', () => {
      expect(
        () =>
          new ConfluenceClient({
            ...VALID_CONFIG,
            // @ts-expect-error intentionally invalid type
            auth: { type: 'oauth', token: 'x' },
          }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when timeout is not a positive number', () => {
      expect(() => new ConfluenceClient({ ...VALID_CONFIG, timeout: -1 })).toThrow(ValidationError);
    });

    it('throws ValidationError when retries is negative', () => {
      expect(() => new ConfluenceClient({ ...VALID_CONFIG, retries: -1 })).toThrow(ValidationError);
    });

    it('throws ValidationError when retries is not an integer', () => {
      expect(() => new ConfluenceClient({ ...VALID_CONFIG, retries: 1.5 })).toThrow(
        ValidationError,
      );
    });

    it('throws ValidationError when retryDelay is not a positive number', () => {
      expect(() => new ConfluenceClient({ ...VALID_CONFIG, retryDelay: 0 })).toThrow(
        ValidationError,
      );
    });

    it('throws ValidationError when maxRetryDelay is not a positive number', () => {
      expect(() => new ConfluenceClient({ ...VALID_CONFIG, maxRetryDelay: 0 })).toThrow(
        ValidationError,
      );
    });
  });

  describe('resource properties', () => {
    let client: ConfluenceClient;

    beforeEach(() => {
      client = new ConfluenceClient({ ...VALID_CONFIG, transport: new MockTransport() });
    });

    it('exposes a pages resource', () => {
      expect(client.pages).toBeInstanceOf(PagesResource);
    });

    it('exposes a spaces resource', () => {
      expect(client.spaces).toBeInstanceOf(SpacesResource);
    });

    it('exposes a blogPosts resource', () => {
      expect(client.blogPosts).toBeInstanceOf(BlogPostsResource);
    });

    it('exposes a comments resource', () => {
      expect(client.comments).toBeInstanceOf(CommentsResource);
    });

    it('exposes an attachments resource', () => {
      expect(client.attachments).toBeInstanceOf(AttachmentsResource);
    });

    it('exposes a labels resource', () => {
      expect(client.labels).toBeInstanceOf(LabelsResource);
    });
  });
});
