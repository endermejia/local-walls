import {
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import type {
  AreaDto,
  AreaInsertDto,
  AreaUpdateDto,
} from '../models/supabase-tables.dto';

@Injectable({ providedIn: 'root' })
export class AreasService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);

  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);
  readonly areas: WritableSignal<AreaDto[]> = signal<AreaDto[]>([]);

  /** List all areas (client-only). On server returns empty list. */
  async listAll(): Promise<AreaDto[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
    this.loading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supabase.client
        .from('areas')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      this.areas.set(data ?? []);
      return data ?? [];
    } catch (e: any) {
      console.error('[AreasService] listAll error', e);
      this.error.set(e?.message ?? 'Unknown error');
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  async getById(id: number): Promise<AreaDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('areas')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.warn('[AreasService] getById error', error);
      return null;
    }
    return data ?? null;
  }

  async getBySlug(slug: string): Promise<AreaDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('areas')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) {
      console.warn('[AreasService] getBySlug error', error);
      return null;
    }
    return data ?? null;
  }

  async create(
    payload: Omit<AreaInsertDto, 'created_at' | 'id'>,
  ): Promise<AreaDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('areas')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[AreasService] create error', error);
      throw error;
    }
    return data as AreaDto;
  }

  async update(
    id: number,
    payload: Omit<AreaUpdateDto, 'id' | 'created_at'>,
  ): Promise<AreaDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('areas')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[AreasService] update error', error);
      throw error;
    }
    return data as AreaDto;
  }

  /** Delete an area by id (client-only). Returns true if deleted. */
  async delete(id: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('areas')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[AreasService] delete error', error);
      throw error;
    }
    // Optimistically update local cache
    try {
      const current = this.areas();
      this.areas.set(current.filter((a) => a.id !== id));
    } catch {}
    return true;
  }
}
