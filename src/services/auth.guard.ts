import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';

export const authGuard: CanMatchFn = async (): Promise<boolean | UrlTree> => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const platformId = inject(PLATFORM_ID);

  // On the server, allow matching to render pages; actual redirects should be handled in serverRoutes if needed
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Ensure client is initialized and try to get session
  await supabase.whenReady();
  const session = await supabase.getSession();
  if (session) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
