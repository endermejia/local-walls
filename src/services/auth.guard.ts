import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { GlobalData } from './global-data';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanMatchFn = (): boolean | UrlTree => {
  const router = inject(Router);
  const global = inject(GlobalData);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (global.isTokenValid()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
