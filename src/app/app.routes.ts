import { Routes } from '@angular/router';

import { adminGuard, areaAdminGuard } from '../guard/admin.guard';
import { authGuard } from '../guard/auth.guard';
import { noAuthGuard } from '../guard/no-auth.guard';
import { rootRedirectGuard } from '../guard/root-redirect.guard';
import { LandingComponent } from '../pages/marketing/landing';

export const routes: Routes = [
  {
    path: 'home',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/dashboard/home').then((m) => m.HomeComponent),
  },
  {
    path: 'merchandising',
    canMatch: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../pages/merchandising/merchandising').then(
            (m) => m.MerchandisingComponent,
          ),
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('../pages/merchandising/checkout').then(
            (m) => m.CheckoutComponent,
          ),
      },
    ],
  },
  {
    path: 'order-success',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/merchandising/order-success').then(
        (m) => m.OrderSuccessComponent,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('../pages/auth/login').then((m) => m.LoginComponent),
  },
  {
    path: 'explore',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/area/explore').then((m) => m.ExploreComponent),
  },
  {
    path: 'profile/config',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/user/user-profile-config').then(
        (m) => m.UserProfileConfigComponent,
      ),
  },
  {
    path: 'profile/:id',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/user/user-profile').then((m) => m.UserProfileComponent),
  },
  {
    path: 'profile',
    pathMatch: 'full',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/user/user-profile').then((m) => m.UserProfileComponent),
  },
  {
    path: 'area',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/area/area-list').then((m) => m.AreaListComponent),
  },
  {
    path: 'area/redirect',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/area/area-redirect').then(
        (m) => m.AreaRedirectComponent,
      ),
  },
  {
    path: 'area/:areaSlug',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/area/area').then((m) => m.AreaComponent),
  },
  {
    path: 'area/:areaSlug/:cragSlug',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/area/crag').then((m) => m.CragComponent),
  },
  {
    path: 'area/:areaSlug/:cragSlug/topo/:id',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/area/topo').then((m) => m.TopoComponent),
  },
  {
    path: 'area/:areaSlug/:cragSlug/:routeSlug',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/area/route').then((m) => m.RouteComponent),
  },
  // Admin and Equipper routes
  {
    path: 'admin',
    canMatch: [adminGuard],
    loadComponent: () =>
      import('../pages/admin/admin').then((m) => m.AdminComponent),
  },
  {
    path: 'admin/unify',
    canMatch: [adminGuard],
    loadComponent: () =>
      import('../pages/admin/unify').then((m) => m.AdminUnifyComponent),
  },
  {
    path: 'my-areas',
    canMatch: [areaAdminGuard],
    loadComponent: () =>
      import('../pages/area/my-areas').then((m) => m.MyAreasComponent),
  },
  {
    path: 'admin/users',
    canMatch: [adminGuard],
    loadComponent: () =>
      import('../pages/admin/users-list').then(
        (m) => m.AdminUsersListComponent,
      ),
  },
  {
    path: 'admin/equippers',
    canMatch: [adminGuard],
    loadComponent: () =>
      import('../pages/admin/equippers-list').then(
        (m) => m.AdminEquippersListComponent,
      ),
  },
  {
    path: 'admin/parkings',
    canMatch: [adminGuard],
    loadComponent: () =>
      import('../pages/admin/parkings-list').then(
        (m) => m.AdminParkingsListComponent,
      ),
  },
  {
    path: 'admin/requests',
    canMatch: [adminGuard],
    loadComponent: () =>
      import('../pages/admin/area-requests').then(
        (m) => m.AdminAreaRequestsComponent,
      ),
  },
  // Public landing page
  {
    path: 'info',
    canMatch: [noAuthGuard],
    component: LandingComponent,
  },
  // SSR fallback routes
  {
    path: '',
    canActivate: [rootRedirectGuard],
    children: [],
  },
  {
    path: 'page-not-found',
    loadComponent: () =>
      import('../pages/marketing/page-not-found').then(
        (m) => m.PageNotFoundComponent,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('../pages/marketing/page-not-found').then(
        (m) => m.PageNotFoundComponent,
      ),
  },
];
