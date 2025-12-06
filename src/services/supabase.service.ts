import {
  Injectable,
  InjectionToken,
  Provider,
  inject,
  PLATFORM_ID,
  computed,
  signal,
  WritableSignal,
  resource,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { Database } from '../models/supabase-generated';

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
  readonly user = computed(() => this.session()?.user ?? null);
  readonly userProfileResource = resource({
    params: () => this.user(),
    loader: async ({ params }) => {
      if (!params?.id) return null;
      const response = await this.client
        .from('user_profiles')
        .select('*')
        .eq('id', params.id)
        .maybeSingle();
      if (response.error) {
        console.error(
          '[SupabaseService] userProfileResource error',
          response.error,
        );
      }
      return response.data ?? null;
    },
  });
  readonly userProfile = computed(() => this.userProfileResource.value());
  readonly lastAuthEvent = computed(() => this._lastEvent());

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
      this._client = createClient<Database>(this.url, this.anonKey);
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
    if (!this._client) return;
    const { error } = await this._client.auth.signOut();
    if (error) console.error('[SupabaseService] signOut error', error);
    else void this.router.navigateByUrl('/login');
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
}
