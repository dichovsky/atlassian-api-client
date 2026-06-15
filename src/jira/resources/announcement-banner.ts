import type { Transport } from '../../core/types.js';

/** The current announcement banner configuration. */
export interface AnnouncementBanner {
  /** Hash of the banner data. The client detects updates by comparing hash IDs. */
  readonly hashId?: string;
  readonly isDismissible: boolean;
  readonly isEnabled: boolean;
  readonly message: string;
  /** Visibility of the announcement banner: `public` or `private`. */
  readonly visibility: 'public' | 'private';
}

/** Request body for updating the announcement banner. */
export interface UpdateAnnouncementBannerData {
  readonly isDismissible?: boolean;
  readonly isEnabled?: boolean;
  readonly message?: string;
  readonly visibility?: string;
}

/** Jira Announcement Banner resource — GET and PUT /rest/api/3/announcementBanner. */
export class AnnouncementBannerResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get the current announcement banner configuration. */
  async get(): Promise<AnnouncementBanner> {
    const response = await this.transport.request<AnnouncementBanner>({
      method: 'GET',
      path: `${this.baseUrl}/announcementBanner`,
    });
    return response.data;
  }

  /** Update the announcement banner configuration. */
  async update(data: UpdateAnnouncementBannerData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/announcementBanner`,
      body: data,
    });
  }
}
