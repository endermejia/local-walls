import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

import { SupabaseService } from './supabase.service';

export const noAuthGuard: CanMatchFn = async (): Promise<boolean | UrlTree> => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  await supabase.whenReady();
  const session = await supabase.getSession();

  if (session) {
    return router.createUrlTree(['/home']);
  }

  return true;
};
