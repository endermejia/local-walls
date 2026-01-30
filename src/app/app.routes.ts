import { Routes } from '@angular/router';

import { adminGuard, authGuard, equipperGuard } from '../services';

export const routes: Routes = [
  {
    path: 'home',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/home').then((m) => m.HomeComponent),
  },
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
    path: 'profile',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/user-profile').then((m) => m.UserProfileComponent),
  },
  {
    path: 'profile/config',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/user-profile-config').then(
        (m) => m.UserProfileConfigComponent,
      ),
  },
  {
    path: 'profile/:id',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/user-profile').then((m) => m.UserProfileComponent),
  },
  {
    path: 'area',
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
    path: 'area/:areaSlug/:cragSlug',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/crag').then((m) => m.CragComponent),
  },
  {
    path: 'area/:areaSlug/:cragSlug/topo/:id',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/topo').then((m) => m.TopoComponent),
  },
  {
    path: 'area/:areaSlug/:cragSlug/:routeSlug',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/route').then((m) => m.RouteComponent),
  },
  // Admin and Equipper routes
  {
    path: 'admin',
    canMatch: [adminGuard],
    loadComponent: () => import('../pages/admin').then((m) => m.AdminComponent),
  },
  {
    path: 'my-areas',
    canMatch: [equipperGuard],
    loadComponent: () =>
      import('../pages/my-areas').then((m) => m.MyAreasComponent),
  },
  {
    path: 'admin/users',
    canMatch: [adminGuard],
    loadComponent: () =>
      import('../pages/admin-users-list').then(
        (m) => m.AdminUsersListComponent,
      ),
  },
  {
    path: 'admin/equippers',
    canMatch: [adminGuard],
    loadComponent: () =>
      import('../pages/admin-equippers-list').then(
        (m) => m.AdminEquippersListComponent,
      ),
  },
  {
    path: 'admin/parkings',
    canMatch: [adminGuard],
    loadComponent: () =>
      import('../pages/admin-parkings-list').then(
        (m) => m.AdminParkingsListComponent,
      ),
  },
  // SSR fallback routes
  {
    path: '',
    redirectTo: 'home',
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
