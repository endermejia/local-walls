import {
  computed,
  effect,
  resource,
  ResourceOptions,
  ResourceRef,
  Signal,
} from '@angular/core';

import { CacheService } from '../services/cache.service';
import { ToastService } from '../services/toast.service';

import { handleErrorToast } from './handle-error';

/**
 * Polls an Angular resource until its value is not undefined (i.e., it has finished loading).
 * @param resource The resource to poll.
 * @param maxAttempts Maximum number of polling attempts.
 * @param interval Interval between attempts in milliseconds.
 * @returns The resource value if loaded, or undefined if timeout is reached.
 */
export async function waitForResource<T>(
  resource: ResourceRef<T>,
  maxAttempts = 60,
  interval = 50,
): Promise<T | undefined> {
  for (let i = 0; i < maxAttempts; i++) {
    const val = resource.value();
    if (val !== undefined) {
      return val;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return undefined;
}

export interface WatchResourceErrorOptions {
  toast?: ToastService;
  logTag?: string;
  onError?: (err: unknown) => void;
}

/**
 * Automatically watches a resource's `.error()` signal and displays toast notifications + logs when a fetch fails.
 */
export function watchResourceError<T>(
  res: ResourceRef<T>,
  options?: WatchResourceErrorOptions,
): void {
  effect(() => {
    const err = res.error();
    if (err) {
      const tag = options?.logTag || 'Resource';
      console.error(`[${tag}] Resource loader error:`, err);
      if (options?.toast) {
        handleErrorToast(err, options.toast);
      }
      if (options?.onError) {
        options.onError(err);
      }
    }
  });
}

/**
 * Enhanced resource creator that incorporates error watching, logging, and toast feedback.
 */
export function createSafeResource<T, P = unknown>(
  options: ResourceOptions<T, P> & WatchResourceErrorOptions,
): ResourceRef<T | undefined> {
  const res = resource(options);
  watchResourceError(res, {
    toast: options.toast,
    logTag: options.logTag,
    onError: options.onError,
  });
  return res;
}

export interface CachedResourceConfig<P, T> extends WatchResourceErrorOptions {
  params?: () => P;
  isBrowser: boolean;
  cacheKey: (params: P) => string | null;
  fetcher: (params: P) => Promise<T>;
  cache: CacheService;
  fallbackValue: T;
  logTag?: string;
  ttlMs?: number;
}

/**
 * Creates an Angular resource combined with CacheService fallback and error handling.
 */
export function createCachedResource<P, T>(
  config: CachedResourceConfig<P, T>,
): {
  resource: ResourceRef<T | undefined>;
  signal: Signal<T>;
} {
  const res = resource({
    params: () => ({
      param: config.params ? config.params() : (undefined as P),
      isBrowser: config.isBrowser,
    }),
    loader: async ({ params: { param, isBrowser } }) => {
      if (!isBrowser) {
        return config.fallbackValue;
      }
      const key = config.cacheKey(param);
      if (!key) {
        return config.fallbackValue;
      }
      try {
        return await config.cache.fetchOrCache(
          key,
          () => config.fetcher(param),
          {
            fallbackValue: config.fallbackValue,
            logTag: config.logTag || 'CachedResource',
            ttlMs: config.ttlMs,
          },
        );
      } catch (err) {
        console.error(
          `[${config.logTag || 'CachedResource'}] Loader error:`,
          err,
        );
        if (config.toast) {
          handleErrorToast(err, config.toast);
        }
        if (config.onError) {
          config.onError(err);
        }
        return config.fallbackValue;
      }
    },
  });

  watchResourceError(res, {
    toast: config.toast,
    logTag: config.logTag || 'CachedResource',
    onError: config.onError,
  });

  const sig = computed(() => {
    let val: T | undefined;
    try {
      if (res.hasValue()) {
        val = res.value();
      }
    } catch {
      val = undefined;
    }
    if (val !== undefined && val !== config.fallbackValue) return val;
    const p = config.params ? config.params() : (undefined as P);
    const key = config.cacheKey(p);
    if (!key) return val !== undefined ? val : config.fallbackValue;
    const cached = config.cache.get<T | undefined>(
      key,
      undefined,
      config.ttlMs,
    );
    if (cached !== undefined) return cached;
    return val !== undefined ? val : config.fallbackValue;
  });

  return { resource: res, signal: sig };
}

/**
 * Safely reads a resource's value, returning a fallback if the resource is in an error state
 * or hasn't produced a value yet, avoiding uncaught ResourceValueError exceptions in computed signals.
 */
export function safeResourceValue<T>(res: {
  value: () => T | undefined;
  error?: () => unknown;
}): T | undefined;
export function safeResourceValue<T>(
  res: { value: () => T | undefined; error?: () => unknown },
  fallback: T,
): T;
export function safeResourceValue<T>(
  res: { value: () => T | undefined; error?: () => unknown },
  fallback?: T,
): T | undefined {
  try {
    if (res.error?.()) {
      return fallback;
    }
    const val = res.value();
    return val !== undefined ? val : fallback;
  } catch {
    return fallback;
  }
}
