import { CanMatchFn, Route, Router, UrlTree } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanMatchFn = async (
  route: Route,
): Promise<boolean | UrlTree> => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const platformId = inject(PLATFORM_ID);

  // On the server, allow matching to render pages; actual redirects should be handled in serverRoutes if needed
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Wait for client init (resolves from localStorage, no network call needed).
  await supabase.whenReady();
  const session = supabase.session();
  if (!session) {
    return router.createUrlTree(['/login']);
  }

  // If the user name is equal to their email, they need to complete their profile setup.
  // We redirect them to /profile/config unless they are already going there.
  if (route.path !== 'profile/config') {
    // We try to get the profile from the resource, or fetch it if not available yet.
    let profileName = supabase.userProfile()?.name;

    if (!profileName) {
      try {
        const { data, error } = await supabase.client
          .from('user_profiles')
          .select('name')
          .eq('id', session.user.id)
          .maybeSingle();
        if (error) throw error;
        profileName = data?.name;
      } catch (e) {
        console.warn('[authGuard] Error fetching user profile name, falling back to cache', e);
        try {
          const cacheKey = `cached_user_profile_${session.user.id}_v1`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            profileName = parsed?.name;
          }
        } catch (cacheErr) {
          console.warn('[authGuard] Error reading from cache', cacheErr);
        }
      }
    }

    if (profileName && profileName === session.user.email) {
      return router.createUrlTree(['/profile/config']);
    }
  } else {
    // When on the profile config route, always fetch fresh data to check if setup is complete
    try {
      const { data, error } = await supabase.client
        .from('user_profiles')
        .select('name')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      // If profile is now complete (name != email), refresh the signal
      if (data?.name && data.name !== session.user.email) {
        supabase.userProfileResource.reload();
      }
    } catch (e) {
      console.warn('[authGuard] Error fetching profile data on config route', e);
    }
  }

  return true;
};
