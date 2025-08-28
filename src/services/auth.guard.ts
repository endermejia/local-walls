import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { GlobalData } from './global-data';

export const authGuard: CanMatchFn = (): boolean | UrlTree => {
  const router = inject(Router);
  const global = inject(GlobalData);
  if (global.isTokenValid()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
