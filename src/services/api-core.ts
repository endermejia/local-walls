import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface HttpOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  cache?: RequestCache;
}

export class ApiCore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  constructor(private readonly baseUrl = '') {}

  protected buildUrl(path: string, query?: HttpOptions['query']): string {
    const url = new URL(path.startsWith('http') ? path : this.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === '') continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  protected async get<T>(path: string, opts: HttpOptions = {}): Promise<T> {
    if (!this.isBrowser) {
      // Avoid network calls during SSR to external origins
      throw new Error('HTTP GET attempted during SSR');
    }
    const url = this.buildUrl(path, opts.query);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        ...(opts.headers ?? {}),
      },
      cache: opts.cache ?? 'default',
      credentials: 'omit',
      mode: 'cors',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }
    return (await res.json()) as T;
  }
}
