import type { Transport } from '../../core/types.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor } from '../../core/pagination.js';
import type {
  BlogPost,
  ListBlogPostsParams,
  CreateBlogPostData,
  UpdateBlogPostData,
} from '../types.js';

export class BlogPostsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List blog posts with optional filtering. */
  async list(params?: ListBlogPostsParams): Promise<CursorPaginatedResponse<BlogPost>> {
    const response = await this.transport.request<CursorPaginatedResponse<BlogPost>>({
      method: 'GET',
      path: `${this.baseUrl}/blogposts`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Get a blog post by ID. */
  async get(id: string): Promise<BlogPost> {
    const response = await this.transport.request<BlogPost>({
      method: 'GET',
      path: `${this.baseUrl}/blogposts/${encodeURIComponent(id)}`,
    });
    return response.data;
  }

  /** Create a new blog post. */
  async create(data: CreateBlogPostData): Promise<BlogPost> {
    const response = await this.transport.request<BlogPost>({
      method: 'POST',
      path: `${this.baseUrl}/blogposts`,
      body: data,
    });
    return response.data;
  }

  /** Update an existing blog post. */
  async update(id: string, data: UpdateBlogPostData): Promise<BlogPost> {
    const response = await this.transport.request<BlogPost>({
      method: 'PUT',
      path: `${this.baseUrl}/blogposts/${encodeURIComponent(id)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a blog post. */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/blogposts/${encodeURIComponent(id)}`,
    });
  }

  /** Iterate over all blog posts across all result pages. */
  async *listAll(params?: Omit<ListBlogPostsParams, 'cursor'>): AsyncGenerator<BlogPost> {
    yield* paginateCursor<BlogPost>(
      this.transport,
      `${this.baseUrl}/blogposts`,
      params as Record<string, string | number | boolean | undefined>,
    );
  }
}
