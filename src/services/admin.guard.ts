import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GlobalData } from './global-data';

/** Allows route matching only for admin users. On server, always allow. */
export const adminGuard: CanMatchFn = async (): Promise<boolean | UrlTree> => {
  const router = inject(Router);
  const global = inject(GlobalData);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  if (global.isAdmin()) return true;

  // Redirige a la página 404 para mostrar el componente PageNotFound
  return router.createUrlTree(['/page-not-found']);
};
