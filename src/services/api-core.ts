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
    // Compose full path first
    const composed = path.startsWith('http') ? path : this.baseUrl + path;

    // Build URL. For relative paths, provide origin when in browser.
    let url: URL;
    if (composed.startsWith('http')) {
      url = new URL(composed);
    } else if (this.isBrowser && typeof window !== 'undefined') {
      url = new URL(composed, window.location.origin);
    } else {
      // In non-browser contexts we should not be building relative URLs
      throw new Error('Cannot build relative URL outside of the browser');
    }

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
