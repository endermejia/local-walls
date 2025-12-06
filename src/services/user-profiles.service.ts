import {
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import type { Database } from '../models/supabase-generated';

export type UserProfileRow =
  Database['public']['Tables']['user_profiles']['Row'];
export type UserProfileInsert =
  Database['public']['Tables']['user_profiles']['Insert'];
export type UserProfileUpdate =
  Database['public']['Tables']['user_profiles']['Update'];

@Injectable({ providedIn: 'root' })
export class UserProfilesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);

  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  /** Get profile by auth user id (client-only). */
  async getByUserId(userId: string): Promise<UserProfileRow | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client
        .from('area_likes')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data as UserProfileRow | null) ?? null;
    } catch (e: any) {
      console.error('[UserProfilesService] getByUserId error', e);
      this.error.set(e?.message ?? 'Unknown error');
      return null;
    }
  }

  /** Get current session user's profile (client-only). */
  async getCurrent(): Promise<UserProfileRow | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    try {
      const { data: userResp, error: userErr } =
        await this.supabase.client.auth.getUser();
      if (userErr) throw userErr;
      const userId = userResp.user?.id;
      if (!userId) return null;
      return this.getByUserId(userId);
    } catch (e: any) {
      console.error('[UserProfilesService] getCurrent error', e);
      this.error.set(e?.message ?? 'Unknown error');
      return null;
    }
  }

  /** Upsert profile for the given user id (client-only). */
  async upsertForUser(
    userId: string,
    patch: Partial<Omit<UserProfileInsert, 'user_id'>>,
  ): Promise<UserProfileRow | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    this.loading.set(true);
    this.error.set(null);
    try {
      const payload: UserProfileInsert = {
        user_id: userId,
        language: patch.language ?? 'es',
        ...patch,
      } as UserProfileInsert;
      const { data, error } = await this.supabase.client
        .from('user_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select('*')
        .single();
      if (error) throw error;
      return data as UserProfileRow;
    } catch (e: any) {
      console.error('[UserProfilesService] upsertForUser error', e);
      this.error.set(e?.message ?? 'Unknown error');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /** Upsert profile for the current user (client-only). */
  async upsertCurrent(
    patch: Partial<Omit<UserProfileInsert, 'user_id'>>,
  ): Promise<UserProfileRow | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data: userResp } = await this.supabase.client.auth.getUser();
    const userId = userResp.user?.id;
    if (!userId) return null;
    return this.upsertForUser(userId, patch);
  }
}
