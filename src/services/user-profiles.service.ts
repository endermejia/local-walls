import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserProfileDto } from '../models';

@Injectable({
  providedIn: 'root',
})
export class UserProfilesService {
  private supabase = inject(SupabaseService);

  /**
   * Get user profile by name (displayName field)
   */
  async getUserProfileByName(name: string): Promise<UserProfileDto | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('user_profiles')
        .select('*')
        .eq('name', name)
        .maybeSingle();

      if (error) {
        console.error('[UserProfileService] Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (e) {
      console.error('[UserProfileService] Exception fetching profile:', e);
      return null;
    }
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
