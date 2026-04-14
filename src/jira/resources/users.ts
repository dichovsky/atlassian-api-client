import type { Transport } from '../../core/types.js';
import type { User, SearchUsersParams } from '../types.js';

export class UsersResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get a user by account ID. */
  async get(accountId: string): Promise<User> {
    const response = await this.transport.request<User>({
      method: 'GET',
      path: `${this.baseUrl}/user`,
      query: { accountId },
    });
    return response.data;
  }

  /** Get the currently authenticated user. */
  async getCurrentUser(): Promise<User> {
    const response = await this.transport.request<User>({
      method: 'GET',
      path: `${this.baseUrl}/myself`,
    });
    return response.data;
  }

  /** Search for users by query string. */
  async search(params: SearchUsersParams): Promise<User[]> {
    const response = await this.transport.request<User[]>({
      method: 'GET',
      path: `${this.baseUrl}/user/search`,
      query: {
        query: params.query,
        startAt: params.startAt,
        maxResults: params.maxResults,
      },
    });
    return response.data;
  }
}
