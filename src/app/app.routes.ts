import { Routes } from '@angular/router';

import { authGuard } from '../services';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('../components/login').then((m) => m.LoginComponent),
  },
  {
    path: 'home',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../components/home').then((m) => m.HomeComponent),
  },
  {
    path: 'zone/:id',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../components/zone').then((m) => m.ZoneComponent),
  },
  {
    path: 'crag/:id',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../components/crag').then((m) => m.CragComponent),
  },
  {
    path: 'topo/:id',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../components/topo').then((m) => m.TopoComponent),
  },
  {
    path: 'route/:id',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../components/route').then((m) => m.RouteComponent),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
