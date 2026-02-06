import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanMatchFn, Route, UrlSegment } from '@angular/router';

import { SupabaseService } from './supabase.service';

export const sessionGuard: CanMatchFn = async (
  route: Route,
  segments: UrlSegment[],
) => {
  const supabase = inject(SupabaseService);
  const platformId = inject(PLATFORM_ID);

  // On the server, we default to showing the landing page (public content)
  if (!isPlatformBrowser(platformId)) {
    return false;
  }

  await supabase.whenReady();
  const session = await supabase.getSession();
  return !!session;
};
