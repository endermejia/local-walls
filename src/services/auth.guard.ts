import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanMatchFn, Route, Router, UrlTree } from '@angular/router';

import { SupabaseService } from './supabase.service';

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

  // Ensure the client is initialized and try to get the session
  await supabase.whenReady();
  const session = await supabase.getSession();
  if (!session) {
    return router.createUrlTree(['/login']);
  }

  // If the user name is equal to their email, they need to complete their profile setup.
  // We redirect them to /profile/config unless they are already going there.
  if (route.path !== 'profile/config') {
    // We try to get the profile from the resource, or fetch it if not available yet.
    let profileName = supabase.userProfile()?.name;

    if (!profileName) {
      const { data } = await supabase.client
        .from('user_profiles')
        .select('name')
        .eq('id', session.user.id)
        .maybeSingle();
      profileName = data?.name;
    }

    if (profileName && profileName === session.user.email) {
      return router.createUrlTree(['/profile/config']);
    }
  } else {
    // When on the profile config route, always fetch fresh data to check if setup is complete
    const { data } = await supabase.client
      .from('user_profiles')
      .select('name')
      .eq('id', session.user.id)
      .maybeSingle();

    // If profile is now complete (name != email), refresh the signal
    if (data?.name && data.name !== session.user.email) {
      supabase.userProfileResource.reload();
    }
  }

  return true;
};
