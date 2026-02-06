import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { SupabaseService } from './supabase.service';

/**
 * Guard that redirects authenticated users to /home and non-authenticated users to /info.
 * Used for the root path ('') to provide different landing pages based on auth status.
 */
export const rootRedirectGuard: CanActivateFn = async (): Promise<
  boolean | UrlTree
> => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const platformId = inject(PLATFORM_ID);

  // On the server, redirect to /info (landing page) by default
  if (!isPlatformBrowser(platformId)) {
    return router.createUrlTree(['/info']);
  }

  // On the client, check if user is authenticated
  await supabase.whenReady();
  const session = await supabase.getSession();

  if (session) {
    // Authenticated user -> redirect to /home
    return router.createUrlTree(['/home']);
  } else {
    // Non-authenticated user -> redirect to /info
    return router.createUrlTree(['/info']);
  }
};
