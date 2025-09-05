import { RenderMode, ServerRoute, PrerenderFallback } from '@angular/ssr';
import { inject } from '@angular/core';
import { GlobalData } from '../services';

// Define server routes with prerendering for parameterized paths and
// proper SSR redirects/HTTP statuses for Netlify Edge SSR.

export const serverRoutes: ServerRoute[] = [
  // SSR redirect for root to home (Netlify SSR ignores _redirects)
  {
    path: '',
    renderMode: RenderMode.Server,
    headers: { Location: '/home' },
    status: 302,
  },

  { path: 'login', renderMode: RenderMode.Server },

  // Home can be prerendered safely
  { path: 'home', renderMode: RenderMode.Server },

  // Parameterized routes as Server routes instead of prerender
  {
    path: 'zone/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'crag/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'topo/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'route/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'page-not-found',
    renderMode: RenderMode.Server,
  },
  // Permitir que el cliente maneje rutas desconocidas
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
