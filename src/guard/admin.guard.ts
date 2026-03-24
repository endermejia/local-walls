import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

import { waitForResource } from '../utils';

import { SupabaseService } from '../services/supabase.service';

/** Allows route matching only for admin users. On server, always allow. */
export const adminGuard: CanMatchFn = async (): Promise<boolean | UrlTree> => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  // Ensure the client is initialized and session is loaded
  await supabase.whenReady();
  const session = await supabase.getSession();

  if (!session) {
    return router.createUrlTree(['/login']);
  }

  // Wait for user profile to be loaded
  const profile = await waitForResource(supabase.userProfileResource);

  if (profile !== undefined) {
    if (profile?.is_admin) {
      return true;
    }

    // User is logged in but not an admin
    console.warn(
      '[AdminGuard] User is not admin. is_admin:',
      profile?.is_admin,
    );
    return router.createUrlTree(['/page-not-found']);
  }

  // If profile didn't load after waiting, redirect to page-not-found
  console.error('[AdminGuard] Timeout waiting for user profile');
  return router.createUrlTree(['/page-not-found']);
};

/** Allows route matching for admin or area admin users. On server, always allow. */
export const areaAdminGuard: CanMatchFn = async (): Promise<
  boolean | UrlTree
> => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  await supabase.whenReady();
  const session = await supabase.getSession();

  if (!session) {
    return router.createUrlTree(['/login']);
  }

  const profile = await waitForResource(supabase.userProfileResource);

  if (profile !== undefined) {
    if (profile?.is_admin) {
      return true;
    }

    // Check if user has area admin permissions
    const areas = await waitForResource(supabase.adminAreasResource);
    if (areas !== undefined && areas.length > 0) {
      return true;
    }

    console.warn('[AreaAdminGuard] User has no admin permissions');
  }

  return router.createUrlTree(['/page-not-found']);
};
