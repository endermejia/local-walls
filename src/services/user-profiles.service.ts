import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserProfileDto } from '../models';

@Injectable({
  providedIn: 'root',
})
export class UserProfilesService {
  private supabase = inject(SupabaseService);

  /**
   * Obtiene un perfil de usuario por su nombre (displayName field)
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
    } catch (error) {
      console.error('[UserProfileService] Exception fetching profile:', error);
      return null;
    }
  }

  /**
   * Actualiza el perfil del usuario autenticado
   */
  async updateUserProfile(
    updates: Partial<UserProfileDto>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const userId = this.supabase.authUserId();
      if (!userId) {
        return { success: false, error: 'Usuario no autenticado' };
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

      // Forzar recarga del perfil en el servicio de Supabase
      this.supabase.userProfileResource.reload();

      return { success: true };
    } catch (error) {
      console.error('[UserProfileService] Exception updating profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}
