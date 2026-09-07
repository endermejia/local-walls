import { inject, Injectable } from '@angular/core';

import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { UserProfileDto } from '../models';

import { SupabaseNotInitializedError } from '../models';
import { Database } from '../models/supabase-generated';

import { IS_BROWSER } from '../app/is-browser';

import { LocalStorage } from './local-storage';
import { SupabaseAuthService } from './supabase-auth.service';
import {
  provideSupabaseConfig,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  SupabaseConfig,
  SupabaseConfigService,
} from './supabase-config.service';
import { SupabaseStorageService } from './supabase-storage.service';

export type { SupabaseConfig };
export { provideSupabaseConfig, SUPABASE_ANON_KEY, SUPABASE_URL };

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly localStorage = inject(LocalStorage);
  private readonly configService = inject(SupabaseConfigService);
  private readonly storageService = inject(SupabaseStorageService);
  private readonly authService = inject(SupabaseAuthService);

  private _client: SupabaseClient<Database> | null = null;
  private _readyResolve: (() => void) | null = null;
  private readonly _ready: Promise<void>;

  // Auth signals re-exported for backwards compatibility
  readonly session = this.authService.session;
  readonly lastAuthEvent = this.authService.lastAuthEvent;
  readonly authUser = this.authService.authUser;
  readonly authUserId = this.authService.authUserId;
  readonly userProfileResource = this.authService.userProfileResource;
  readonly userProfile = this.authService.userProfile;
  readonly adminAreasResource = this.authService.adminAreasResource;
  readonly adminAreas = this.authService.adminAreas;
  readonly adminIndoorCentersResource =
    this.authService.adminIndoorCentersResource;
  readonly adminIndoorCenters = this.authService.adminIndoorCenters;
  readonly routesetterIndoorCentersResource =
    this.authService.routesetterIndoorCentersResource;
  readonly routesetterIndoorCenters = this.authService.routesetterIndoorCenters;

  constructor() {
    this._ready = new Promise<void>(
      (resolve) => (this._readyResolve = resolve),
    );
    this.authService.setClientGetter(
      () => this.client,
      () => this.whenReady(),
    );

    if (this.isBrowser && typeof window !== 'undefined') {
      void this.initClient();
    } else {
      this._readyResolve?.();
    }
  }

  private async initClient(): Promise<void> {
    if (this._client) return;
    const url = this.configService.url;
    const anonKey = this.configService.anonKey;

    if (!url || !anonKey) {
      console.warn(
        '[SupabaseService] Missing SUPABASE config. Provide it via provideSupabaseConfig({ url, anonKey }).',
      );
      this._readyResolve?.();
      this._readyResolve = null;
      return;
    }
    try {
      const { createClient } = await import('@supabase/supabase-js');
      this._client = createClient<Database>(url, anonKey, {
        global: {
          fetch: async (reqUrl, options) => {
            const controller = new AbortController();
            const isOffline =
              typeof navigator !== 'undefined' && !navigator.onLine;
            const urlStr = reqUrl.toString();
            const isStorageOrUpload =
              urlStr.includes('/storage/v1') ||
              urlStr.includes('/functions/v1') ||
              options?.body instanceof Blob ||
              options?.body instanceof FormData ||
              options?.body instanceof ArrayBuffer ||
              options?.body instanceof Uint8Array;

            // Give uploads up to 2 minutes, standard queries 15 seconds, offline 3 seconds
            const timeoutMs = isOffline
              ? 3000
              : isStorageOrUpload
                ? 120000
                : 15000;

            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            if (options?.signal) {
              if (options.signal.aborted) {
                controller.abort(options.signal.reason);
              } else {
                options.signal.addEventListener(
                  'abort',
                  () => controller.abort(options.signal?.reason),
                  { once: true },
                );
              }
            }
            try {
              const response = await fetch(reqUrl, {
                ...options,
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              return response;
            } catch (err) {
              clearTimeout(timeoutId);
              throw err;
            }
          },
        },
        auth: {
          storage: this.localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      });

      this._client.auth.onAuthStateChange((event, sess) => {
        this.authService._session.set(sess ?? null);
        this.authService._lastEvent.set(event ?? null);
        if (this._readyResolve) {
          this._readyResolve();
          this._readyResolve = null;
        }
      });
      try {
        const { data } = await this._client.auth.getSession();
        this.authService._session.set(data?.session ?? null);
      } catch (err) {
        console.warn('[SupabaseService] getSession error:', err);
      } finally {
        if (this._readyResolve) {
          this._readyResolve();
          this._readyResolve = null;
        }
      }
    } catch (e) {
      console.error('[SupabaseService] Failed to initialize client', e);
      this._readyResolve?.();
      this._readyResolve = null;
    }
  }

  whenReady(): Promise<void> {
    return this._ready;
  }

  get client() {
    if (!this._client) {
      throw new SupabaseNotInitializedError();
    }
    return this._client;
  }

  async getClient(): Promise<SupabaseClient<Database>> {
    await this.whenReady();
    return this.client;
  }

  // Delegated auth operations
  async getUserProfile(userId: string): Promise<UserProfileDto | null> {
    return this.authService.getUserProfile(userId);
  }

  async getSession(): Promise<Session | null> {
    return this.authService.getSession(this._client);
  }

  async register(email: string, password: string) {
    return this.authService.register(email, password);
  }

  async login(email: string, password: string) {
    return this.authService.login(email, password);
  }

  async logout(): Promise<void> {
    return this.authService.logout(this._client);
  }

  async deleteAccount(): Promise<void> {
    return this.authService.deleteAccount();
  }

  async resetPassword(email: string, redirectTo?: string) {
    return this.authService.resetPassword(email, redirectTo);
  }

  async updatePassword(newPassword: string) {
    return this.authService.updatePassword(newPassword);
  }

  // Delegated storage operations
  buildAvatarUrl(path?: string | null): string {
    return this.storageService.buildAvatarUrl(path);
  }

  getPublicUrl(bucket: string, path: string | null | undefined): string {
    return this.storageService.getPublicUrl(bucket, path);
  }

  async getTopoSignedUrl(
    path: string | null | undefined,
    version?: number,
  ): Promise<string> {
    return this.storageService.getTopoSignedUrl(
      this._client,
      () => this.whenReady(),
      path,
      version,
    );
  }

  async getAscentSignedUrl(
    path: string | null | undefined,
    options?: {
      transform?: {
        width?: number;
        height?: number;
        resize?: 'cover' | 'contain' | 'fill';
        quality?: number;
        format?: 'origin';
      };
    },
  ): Promise<string> {
    return this.storageService.getAscentSignedUrl(
      this._client,
      () => this.whenReady(),
      path,
      options,
    );
  }

  async uploadAvatar(
    file: File,
  ): Promise<{ path: string; publicUrl: string } | null> {
    return this.storageService.uploadAvatar(this._client, file);
  }
}
