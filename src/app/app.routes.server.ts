import { RenderMode, ServerRoute, PrerenderFallback } from '@angular/ssr';
import { inject } from '@angular/core';
import { GlobalData } from '../services';

// Define server routes with prerendering for parameterized paths and
// proper SSR redirects/HTTP statuses for Netlify Edge SSR.

export const serverRoutes: ServerRoute[] = [
  // SSR redirect for root to home (Netlify SSR ignores _redirects)
  {
    path: '',
    headers: { Location: '/home' },
    status: 302,
  },

  // Client render for login only
  { path: 'login', renderMode: RenderMode.Client },

  // Home can be prerendered safely
  { path: 'home', renderMode: RenderMode.Prerender },

  // Parameterized routes prerendered with fallback to Server for non-listed ids
  {
    path: 'zone/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      // Note: inject must be called synchronously
      const global = inject(GlobalData);
      // Use any available IDs at build time. If none, return empty to skip.
      const ids = (global.zones?.() ?? []).map((z) => z.id);
      return ids.map((id) => ({ id }));
    },
  },
  {
    path: 'crag/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      const global = inject(GlobalData);
      const ids = (global.crags?.() ?? []).map((c) => c.id);
      return ids.map((id) => ({ id }));
    },
  },
  {
    path: 'topo/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      const global = inject(GlobalData);
      const ids = (global.topos?.() ?? []).map((t) => t.id);
      return ids.map((id) => ({ id }));
    },
  },
  {
    path: 'route/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      const global = inject(GlobalData);
      const ids = (global.routesData?.() ?? []).map((r) => r.id);
      return ids.map((id) => ({ id }));
    },
  },

  // Wildcard: render everything else on the server and mark 404
  { path: '**', renderMode: RenderMode.Server, status: 404 },
];
