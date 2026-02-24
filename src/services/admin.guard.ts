import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

import { waitForResource } from '../utils';

import { SupabaseService } from './supabase.service';

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

  // Wait for user role to be loaded
  // The userRoleResource will load automatically when session is available
  const roleData = await waitForResource(supabase.userRoleResource);

  if (roleData !== undefined) {
    // Role data is loaded (could be the role object or null)
    if (roleData?.role === 'admin') {
      return true;
    }

    // User is logged in but not an admin
    console.warn('[AdminGuard] User is not admin. Role:', roleData?.role);
    return router.createUrlTree(['/page-not-found']);
  }

  // If role didn't load after waiting, redirect to page-not-found
  console.error('[AdminGuard] Timeout waiting for user role');
  return router.createUrlTree(['/page-not-found']);
};

/** Allows route matching for admin or equipper users. On server, always allow. */
export const equipperGuard: CanMatchFn = async (): Promise<
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

  const roleData = await waitForResource(supabase.userRoleResource);

  if (roleData !== undefined) {
    if (roleData?.role === 'admin') {
      return true;
    }
    if (roleData?.role === 'equipper') {
      // Wait for equipper areas to load
      const areas = await waitForResource(supabase.equipperAreasResource);
      if (areas !== undefined) {
        if (areas.length > 0) {
          return true;
        }
        console.warn('[EquipperGuard] Equipper has no assigned areas');
        return router.createUrlTree(['/page-not-found']);
      }
    }
    return router.createUrlTree(['/page-not-found']);
  }

  return router.createUrlTree(['/page-not-found']);
};
