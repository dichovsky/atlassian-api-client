import type { Transport, RequestOptions, ApiResponse } from '../../src/core/types.js';

export interface MockCall {
  readonly options: RequestOptions;
}

/** Mock transport that records calls and returns predefined responses. */
export class MockTransport implements Transport {
  readonly calls: MockCall[] = [];
  private responses: (ApiResponse<unknown> | Error)[] = [];

  /** Queue a successful response. */
  respondWith<T>(data: T, status = 200): this {
    this.responses.push({
      data,
      status,
      headers: new Headers(),
    });
    return this;
  }

  /** Queue a response with custom headers. */
  respondWithHeaders<T>(data: T, status: number, headers: Record<string, string>): this {
    this.responses.push({
      data,
      status,
      headers: new Headers(headers),
    });
    return this;
  }

  /** Queue an error to throw. */
  respondWithError(error: Error): this {
    this.responses.push(error);
    return this;
  }

  /** Get the last call made. */
  get lastCall(): MockCall | undefined {
    return this.calls[this.calls.length - 1];
  }

  async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    this.calls.push({ options });
    const response = this.responses.shift();
    if (!response) {
      throw new Error('MockTransport: no response queued');
    }
    if (response instanceof Error) {
      throw response;
    }
    return response as ApiResponse<T>;
  }

  reset(): void {
    this.calls.length = 0;
    this.responses.length = 0;
  }
}
