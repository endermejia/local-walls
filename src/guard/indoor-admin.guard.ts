import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { GlobalData } from '../services/global-data';

export const indoorAdminGuard = () => {
  const global = inject(GlobalData);
  const router = inject(Router);

  // In a complete implementation, this would check if the user is an admin of the specific center
  // For now, we'll just check if they have the indoor feature enabled or are a superadmin
  if (global.indoorFeature() || global.isAdmin()) {
    return true;
  }

  return router.parseUrl('/explore');
};
