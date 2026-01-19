import { inject, Injectable } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, Observable } from 'rxjs';

import { UserProfileDto } from '../models';

import {
  AvatarCropperComponent,
  AvatarCropperResult,
  Import8aComponent,
} from '../components';

import { UserProfileConfigComponent } from '../pages/user-profile-config';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class UserProfilesService {
  private supabase = inject(SupabaseService);
  private dialogs = inject(TuiDialogService);
  private translate = inject(TranslateService);

  openUserProfileConfigForm(): void {
    void firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(UserProfileConfigComponent), {
        appearance: 'fullscreen',
        closable: false,
        dismissible: false,
      }),
      { defaultValue: undefined },
    );
  }

  openImport8aDialog(): void {
    void firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(Import8aComponent), {
        label: this.translate.instant('import8a.searchTitle'),
        size: 'l',
        dismissible: true,
        closable: true,
      }),
      { defaultValue: undefined },
    );
  }

  openAvatarCropper(
    file: File,
    size = 512,
  ): Observable<AvatarCropperResult | null> {
    return this.dialogs.open<AvatarCropperResult | null>(
      new PolymorpheusComponent(AvatarCropperComponent),
      {
        size: 'm',
        data: { file, size },
        appearance: 'fullscreen',
        closable: false,
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
}
