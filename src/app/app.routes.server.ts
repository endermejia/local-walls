import { RenderMode, ServerRoute, PrerenderFallback } from '@angular/ssr';
import { inject } from '@angular/core';
import { GlobalData } from '../services';

// Define server routes with prerendering for parameterized paths.
// We prerender a subset of IDs available at build time. Since data is mocked
// in GlobalData and filled from ApiService on the client, we rely on the
// initial signals values which are empty arrays by default. To ensure we have
// some useful prerendered pages, we'll prerender the home and a minimal set
// of dynamic paths derived from searchPopular when possible.

export const serverRoutes: ServerRoute[] = [
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

  // Default: render everything else on the server
  { path: '**', renderMode: RenderMode.Server },
];
