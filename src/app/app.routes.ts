import { Routes } from '@angular/router';

import { authGuard } from '../services';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('../pages/login').then((m) => m.LoginComponent),
  },
  {
    path: 'home',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/home').then((m) => m.HomeComponent),
  },
  {
    path: 'zone/:id',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/zone').then((m) => m.ZoneComponent),
  },
  {
    path: 'crag/:id',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/crag').then((m) => m.CragComponent),
  },
  {
    path: 'topo/:id',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/topo').then((m) => m.TopoComponent),
  },
  {
    path: 'route/:id',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/route').then((m) => m.RouteComponent),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
