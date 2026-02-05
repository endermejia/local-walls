import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, Observable } from 'rxjs';

import { UserProfileDto } from '../models';

import { ImageEditorDialogComponent } from '../dialogs/image-editor-dialog';
import { Import8aComponent } from '../components/import-8a';

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
          aspectRatios: [
            { titleKey: 'square', descriptionKey: '1:1', ratio: 1 },
          ],
          forceAspectRatio: true,
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

      const { error } = await this.supabase.client
        .from('user_profiles')
        .update({
          ...updates,
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

  async searchUsers(query: string): Promise<UserProfileDto[]> {
    if (!query.trim()) return [];
    const { data } = await this.supabase.client
      .from('user_profiles')
      .select('*')
      .ilike('name', `%${query}%`)
      .neq('id', this.supabase.authUserId() || '')
      .limit(10);
    return data || [];
  }

  async getUserProfile(userId: string): Promise<UserProfileDto | null> {
    const { data, error } = await this.supabase.client
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[UserProfileService] Error getting profile:', error);
      return null;
    }

    return data;
  }
}
