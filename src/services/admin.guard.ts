import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GlobalData } from './global-data';
import { SupabaseService } from './supabase.service';

/** Allows route matching only for admin users. On server, always allow. */
export const adminGuard: CanMatchFn = async (): Promise<boolean | UrlTree> => {
  const router = inject(Router);
  const global = inject(GlobalData);
  const supabase = inject(SupabaseService);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  // Ensure the client is initialized and session is loaded
  await supabase.whenReady();
  const session = await supabase.getSession();

  if (!session) {
    return router.createUrlTree(['/login']);
  }

  // Wait for user role to be loaded
  // The userRoleResource will load automatically when session is available
  const maxAttempts = 60; // 3 seconds total (60 * 50ms)
  let attempts = 0;

  while (attempts < maxAttempts) {
    // Check if the resource has finished loading (is not undefined)
    const roleData = supabase.userRoleResource.value();

    if (roleData !== undefined) {
      // Role data is loaded (could be the role object or null)
      if (roleData?.role === 'admin') {
        return true;
      }

      // User is logged in but not an admin
      console.warn('[AdminGuard] User is not admin. Role:', roleData?.role);
      return router.createUrlTree(['/page-not-found']);
    }

    // Wait a bit for the role to load
    await new Promise((resolve) => setTimeout(resolve, 50));
    attempts++;
  }

  // If role didn't load after waiting, redirect to page-not-found
  console.error('[AdminGuard] Timeout waiting for user role');
  return router.createUrlTree(['/page-not-found']);
};
