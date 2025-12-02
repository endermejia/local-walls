import { Routes } from '@angular/router';

import { authGuard } from '../services';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('../pages/login').then((m) => m.LoginComponent),
  },
  {
    path: 'explore',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/explore').then((m) => m.ExploreComponent),
  },
  {
    path: 'areas',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/area-list').then((m) => m.AreaListComponent),
  },
  {
    path: 'area/:areaSlug',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/area').then((m) => m.AreaComponent),
  },
  {
    path: 'crag/:countrySlug/:cragSlug',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/crag').then((m) => m.CragComponent),
  },
  {
    path: 'sector/:countrySlug/:cragSlug/:sectorSlug',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/topo').then((m) => m.TopoComponent),
  },
  // Admin-only area management
  {
    path: 'route/:countrySlug/:cragSlug/sector/:sectorSlug/:zlaggableSlug',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/route').then((m) => m.RouteComponent),
  },
  {
    path: '',
    redirectTo: 'explore',
    pathMatch: 'full',
  },
  {
    path: 'page-not-found',
    loadComponent: () =>
      import('../pages/page-not-found').then((m) => m.PageNotFoundComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('../pages/page-not-found').then((m) => m.PageNotFoundComponent),
  },
];
