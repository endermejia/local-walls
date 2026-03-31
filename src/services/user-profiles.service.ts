import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, Observable } from 'rxjs';

import { Import8aComponent } from '../components/ascent/import-8a';

import {
  RouteDto,
  UserProfileBasicDto,
  UserProfileDto,
  UserProfileUpdateDto,
  UserPyramidSlotDto,
  UserPyramidSlotInsertDto,
} from '../models';

import { normalizeName } from '../utils';

import { ImageEditorDialogComponent } from '../components/dialogs/image-editor-dialog';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class UserProfilesService {
  private supabase = inject(SupabaseService);
  private dialogs = inject(TuiDialogService);
  private translate = inject(TranslateService);
  private router = inject(Router);

  openUserProfileConfigForm(): void {
    void this.router.navigate(['/profile/config']);
  }

  openImport8aDialog(): void {
    void firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(Import8aComponent), {
        label: this.translate.instant('import8a.searchTitle'),
        size: 'l',
        dismissible: false,
        closable: true,
      }),
      { defaultValue: undefined },
    );
  }

  openAvatarCropper(file: File, size = 512): Observable<File | null> {
    return this.dialogs.open<File | null>(
      new PolymorpheusComponent(ImageEditorDialogComponent),
      {
        size: 'l',
        data: {
          file,
          aspectRatios: [{ titleKey: '1:1', descriptionKey: '1:1', ratio: 1 }],
          forceAspectRatio: true,
          resizeToWidth: size,
          imageQuality: 80,
        },
        appearance: 'fullscreen',
        closable: false,
        dismissible: false,
      },
    );
  }

  /**
   * Update the authenticated user profile
   */
  async updateUserProfile(
    updates: Partial<UserProfileDto>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const userId = this.supabase.authUserId();
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('[UserProfileService] Updating profile:', updates);
      const { error } = await this.supabase.client
        .from('user_profiles')
        .update({
          ...(updates as UserProfileUpdateDto),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('[UserProfileService] Error updating profile:', error);
        return { success: false, error: error.message };
      }

      // Force profile reload in Supabase service
      this.supabase.userProfileResource.reload();

      return { success: true };
    } catch (e) {
      console.error('[UserProfileService] Exception updating profile:', e);
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  }

  async searchUsers(query: string): Promise<UserProfileBasicDto[]> {
    const q = `%${query.trim()}%`;
    const qLoose = `%${query
      .trim()
      .split('')
      .map((c) => (/[aeiouáéíóúü]/i.test(c) ? '%' : c))
      .join('')}%`.replace(/%+/g, '%');

    const { data } = await this.supabase.client
      .from('user_profiles')
      .select('id, name, avatar')
      .or(`name.ilike.${q},name.ilike.${qLoose}`)
      .neq('id', this.supabase.authUserId() || '')
      .limit(100);

    const results = data || [];
    const normalizedQuery = normalizeName(query);

    return results
      .filter((u) => normalizeName(u.name).includes(normalizedQuery))
      .slice(0, 10);
  }

  async getUserProfile(userId: string): Promise<UserProfileBasicDto | null> {
    const { data, error } = await this.supabase.client
      .from('user_profiles')
      .select('id, name, avatar')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[UserProfileService] Error getting profile:', error);
      return null;
    }

    return data;
  }

  async getPyramidSlots(
    userId: string,
    year: number,
  ): Promise<
    (UserPyramidSlotDto & {
      route:
        | (RouteDto & { crag?: { slug: string; area?: { slug: string } } })
        | null;
    })[]
  > {
    const { data, error } = await this.supabase.client
      .from('user_pyramid_slots')
      .select('*, route:routes(*, crag:crags(slug, area:areas(slug)))')
      .eq('user_id', userId)
      .eq('year', year);

    if (error) {
      console.error('[UserProfileService] Error getting pyramid slots:', error);
      return [];
    }

    return (
      (data as (UserPyramidSlotDto & {
        route:
          | (RouteDto & { crag?: { slug: string; area?: { slug: string } } })
          | null;
      })[]) || []
    );
  }

  async updatePyramidSlot(
    slot: UserPyramidSlotInsertDto,
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.client
      .from('user_pyramid_slots')
      .upsert(slot, { onConflict: 'user_id,year,level,position' });

    if (error) {
      console.error('[UserProfileService] Error updating pyramid slot:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async deletePyramidSlot(
    slotId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.client
      .from('user_pyramid_slots')
      .delete()
      .eq('id', slotId);

    if (error) {
      console.error('[UserProfileService] Error deleting pyramid slot:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}
