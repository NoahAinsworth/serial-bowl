import { env } from './env';

/**
 * Centralized HTTP client with retry and timeout
 */

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async fetchWithTimeout(
    url: string,
    options: FetchOptions = {}
  ): Promise<Response> {
    const { timeout = 10000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async fetchWithRetry(
    url: string,
    options: FetchOptions = {}
  ): Promise<Response> {
    const { retries = 2, retryDelay = 1000, ...fetchOptions } = options;
    let lastError: Error | null = null;

    for (let i = 0; i <= retries; i++) {
      try {
        const response = await this.fetchWithTimeout(url, fetchOptions);
        
        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry on server errors (5xx)
        if (response.status >= 500 && i < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  async get<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const response = await this.fetchWithRetry(url, {
      ...options,
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async post<T = any>(
    path: string,
    data?: any,
    options: FetchOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const response = await this.fetchWithRetry(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      // Don't retry POST requests by default
      retries: 0,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async put<T = any>(
    path: string,
    data?: any,
    options: FetchOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const response = await this.fetchWithRetry(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      retries: 0,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async delete<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const response = await this.fetchWithRetry(url, {
      ...options,
      method: 'DELETE',
      retries: 0,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export configured instance
export const api = new ApiClient(env.API_BASE_URL);
