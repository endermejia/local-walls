import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { LocalStorage } from './local-storage';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly localStorage = inject(LocalStorage);

  /**
   * Read-through cache lookup. Returns the cached value for `key` if present,
   * otherwise returns `defaultValue`. SSR-safe (always returns defaultValue on server).
   */
  get<T>(key: string, defaultValue: T): T {
    if (!isPlatformBrowser(this.platformId)) return defaultValue;
    const raw = this.localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        // corrupted entry — ignore
      }
    }
    return defaultValue;
  }

  /**
   * Attempt `fetcher()`. On success the result is written to cache and returned.
   * On failure the previously cached value (if any) is returned; otherwise
   * `fallbackValue` is returned. Log output is tagged with `logTag`.
   */
  async fetchOrCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { fallbackValue?: T; logTag?: string },
  ): Promise<T> {
    const tag = options?.logTag ?? 'CacheService';
    const fallback = options?.fallbackValue ?? (undefined as T);

    try {
      const result = await fetcher();
      this.set(key, result);
      return result;
    } catch (e) {
      console.warn(`[${tag}] fetchOrCache error for key: ${key}`, e);
      const cached = this.get<T | undefined>(key, undefined);
      if (cached !== undefined) return cached;
      return fallback;
    }
  }

  /**
   * Write a value to the cache. The value is JSON-serialised automatically.
   */
  set(key: string, value: unknown): void {
    try {
      this.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or unavailable — silently ignore
    }
  }

  /**
   * Remove a single entry from the cache.
   */
  remove(key: string): void {
    this.localStorage.removeItem(key);
  }

  /**
   * Clear the entire cache (localStorage).
   */
  clear(): void {
    this.localStorage.clear();
  }
}
