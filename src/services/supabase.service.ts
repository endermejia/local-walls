import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  inject,
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  Provider,
  resource,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';

import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { AppRole, UserProfileDto } from '../models';
import { Database } from '../models/supabase-generated';

import { ENV_SUPABASE_URL } from '../environments/environment';
import { LocalStorage } from './local-storage';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const SUPABASE_URL = new InjectionToken<string>('SUPABASE_URL');
export const SUPABASE_ANON_KEY = new InjectionToken<string>(
  'SUPABASE_ANON_KEY',
);

export function provideSupabaseConfig(config: SupabaseConfig): Provider[] {
  return [
    { provide: SUPABASE_URL, useValue: config.url },
    { provide: SUPABASE_ANON_KEY, useValue: config.anonKey },
  ];
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly url = inject(SUPABASE_URL, { optional: true });
  private readonly anonKey = inject(SUPABASE_ANON_KEY, { optional: true });
  private readonly router = inject(Router);
  private readonly localStorage = inject(LocalStorage);

  private _client: SupabaseClient<Database> | null = null;
  private _readyResolve: (() => void) | null = null;
  private readonly _ready: Promise<void>;

  // Auth state
  private readonly _session: WritableSignal<Session | null> =
    signal<Session | null>(null);
  private readonly _lastEvent: WritableSignal<string | null> = signal<
    string | null
  >(null);
  readonly session = computed(() => this._session());
  readonly lastAuthEvent = computed(() => this._lastEvent());
  readonly authUser = computed(() => this.session()?.user ?? null);
  readonly authUserId = computed(() => this.authUser()?.id ?? null);
  readonly userProfileResource = resource({
    params: () => this.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId) return null;
      try {
        const { data, error } = await this.client
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('[SupabaseService] userProfileResource error', error);
          throw error;
        }

        if (!data) {
          await this.logout();
          return null;
        }

        return data;
      } catch (e) {
        console.error('[SupabaseService] userProfileResource error', e);
        throw e;
      }
    },
  });
  readonly userProfile = computed(() => this.userProfileResource.value());
  readonly userRoleResource = resource({
    params: () => this.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId) return null;
      const { data, error } = await this.client
        .from('user_roles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.error('[SupabaseService] userRoleResource error', error);
      }
      if (!data) {
        await this.logout();
        return null;
      }
      return data;
    },
  });
  readonly userRole: Signal<AppRole | undefined> = computed(
    () => this.userRoleResource.value()?.role,
  );

  readonly equipperAreasResource = resource({
    params: () => ({
      userId: this.authUserId(),
      role: this.userRole(),
    }),
    loader: async ({ params: { userId, role } }) => {
      if (!userId || role !== 'equipper') return [];
      const { data, error } = await this.client
        .from('area_equippers')
        .select('area_id')
        .eq('user_id', userId);
      if (error) {
        console.error('[SupabaseService] equipperAreasResource error', error);
        return [];
      }
      return data.map((d) => d.area_id);
    },
  });

  readonly equipperAreas = computed(
    () => this.equipperAreasResource.value() ?? [],
  );

  /**
   * Builds a complete public URL for an avatar stored in the Supabase "avatar" bucket
   * from a relative path (e.g.: "avatars/xyz.jpg").
   * Does not access browser APIs; is SSR-safe.
   */
  async getUserProfile(userId: string): Promise<UserProfileDto | null> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[SupabaseService] getUserProfile error', error);
      return null;
    }

    return data;
  }

  buildAvatarUrl(path: string | null | undefined): string {
    return this.getPublicUrl('avatar', path);
  }

  getPublicUrl(bucket: string, path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = (this.url || ENV_SUPABASE_URL || '').replace(/\/$/, '');
    const rel = String(path).replace(/^\//, '');
    return `${base}/storage/v1/object/public/${bucket}/${rel}`;
  }

  /**
   * Gets a signed URL for a topo photo stored in the private "topos" bucket.
   */
  async getTopoSignedUrl(path: string | null | undefined): Promise<string> {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const { data, error } = await this.client.storage
      .from('topos')
      .createSignedUrl(path, 3600); // 1 hour
    if (error) {
      console.error('[SupabaseService] getTopoSignedUrl error', error);
      return '';
    }
    return data.signedUrl;
  }

  /**
   * Gets a signed URL for an ascent photo stored in the private "route-ascent-photos" bucket.
   */
  async getAscentSignedUrl(path: string | null | undefined): Promise<string> {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const { data, error } = await this.client.storage
      .from('route-ascent-photos')
      .createSignedUrl(path, 3600); // 1 hour
    if (error) {
      console.error('[SupabaseService] getAscentSignedUrl error', error);
      return '';
    }
    return data.signedUrl;
  }

  constructor() {
    this._ready = new Promise<void>(
      (resolve) => (this._readyResolve = resolve),
    );
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      // Fire and forget; guard/UI can await whenReady() if needed
      void this.initClient();
    } else {
      // On server, we consider the service not ready and without a client
      this._readyResolve?.();
    }
  }

  /** SSR-safe dynamic import and client initialization */
  private async initClient(): Promise<void> {
    if (this._client) return;
    if (!this.url || !this.anonKey) {
      console.warn(
        '[SupabaseService] Missing SUPABASE config. Provide it via provideSupabaseConfig({ url, anonKey }).',
      );
      this._readyResolve?.();
      return;
    }
    try {
      const { createClient } = await import('@supabase/supabase-js');
      this._client = createClient<Database>(this.url, this.anonKey, {
        auth: {
          storage: this.localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      });
      // Initial session fetch
      const { data } = await this._client.auth.getSession();
      this._session.set(data.session ?? null);
      // Subscribe to auth state changes
      this._client.auth.onAuthStateChange((event, sess) => {
        this._session.set(sess ?? null);
        this._lastEvent.set(event ?? null);
      });
    } catch (e) {
      console.error('[SupabaseService] Failed to initialize client', e);
    } finally {
      this._readyResolve?.();
      this._readyResolve = null;
    }
  }

  /** Returns a promise which resolves when client init attempt is finished (browser only) */
  whenReady(): Promise<void> {
    return this._ready;
  }

  /** Direct access to Supabase client (browser only). Throws if not initialized. */
  get client() {
    if (!this._client) {
      throw new Error(
        'Supabase client is not initialized. Ensure you are in the browser and provideSupabaseConfig is set.',
      );
    }
    return this._client;
  }

  /** Convenience: fetch and return current session (browser only); updates signal */
  async getSession(): Promise<Session | null> {
    if (!this._client) return null;
    const { data, error } = await this._client.auth.getSession();
    if (error) {
      console.warn('[SupabaseService] getSession error', error);
    }
    const sess = data?.session ?? null;
    this._session.set(sess);
    return sess;
  }

  async register(email: string, password: string) {
    if (!this._client) throw new Error('Supabase client not ready');
    return this._client.auth.signUp({ email, password });
  }

  async login(email: string, password: string) {
    if (!this._client) throw new Error('Supabase client not ready');
    return this._client.auth.signInWithPassword({ email, password });
  }

  async logout() {
    // Ensure we only attempt to sign out in the browser where the client exists
    if (!this._client) {
      // Even if no client (SSR or not initialized), navigate to login to reset UI state
      void this.router.navigateByUrl('/login');
      return;
    }
    try {
      // Use local scope to clear client-side session without hitting the global logout endpoint.
      // Supabase global sign-out (`scope: 'global'`) may return 403 in some environments
      // (e.g., missing/expired tokens or restricted cookies during SSR/Edge). Local is enough
      // for this SPA to clear the current device session.
      const { error } = await this._client.auth.signOut({
        scope: 'local' as const,
      });
      if (error) {
        console.error('[SupabaseService] signOut(local) error', error);
      }
    } catch (e) {
      console.error('[SupabaseService] signOut exception', e);
    } finally {
      // Always redirect to login to ensure predictable UX
      void this.router.navigateByUrl('/login');
    }
  }

  async deleteAccount(): Promise<void> {
    if (!this._client) throw new Error('Supabase client not ready');

    const response = await this.client.functions.invoke('delete-user', {
      method: 'POST',
    });

    if (response.error) {
      console.error('[SupabaseService] deleteAccount error', response.error);
      throw response.error;
    }

    await this.logout();
  }

  /** Send password reset email */
  async resetPassword(email: string, redirectTo?: string) {
    if (!this._client) throw new Error('Supabase client not ready');
    return this._client.auth.resetPasswordForEmail(
      email,
      redirectTo ? { redirectTo } : undefined,
    );
  }

  /** Complete password recovery by setting a new password (after PASSWORD_RECOVERY) */
  async updatePassword(newPassword: string) {
    if (!this._client) throw new Error('Supabase client not ready');
    return this._client.auth.updateUser({ password: newPassword });
  }

  /** Upload avatar image to Supabase Edge Function */
  async uploadAvatar(
    file: File,
  ): Promise<{ path: string; publicUrl: string } | null> {
    if (!this._client) throw new Error('Supabase client not ready');

    const base64 = await this.fileToBase64(file);
    const payload = {
      file_name: file.name,
      content_type: file.type,
      base64: base64,
    };

    const response = await this.client.functions.invoke('upload-avatar', {
      body: payload,
    });

    if (response.error) {
      console.error('[SupabaseService] uploadAvatar error', response.error);
      throw response.error;
    }

    console.log('[SupabaseService] uploadAvatar success', response.data);
    return response.data;
  }

  /** Helper: Convert File to base64 string */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove the data:...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
