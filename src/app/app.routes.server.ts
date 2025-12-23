import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';

// Define server routes with prerendering for parameterized paths and
// proper SSR redirects/HTTP statuses for Netlify Edge SSR.

export const serverRoutes: ServerRoute[] = [
  // SSR redirect for root to home (Netlify SSR ignores _redirects)
  {
    path: '',
    renderMode: RenderMode.Server,
    headers: { Location: '/explore' },
    status: 302,
  },

  { path: 'login', renderMode: RenderMode.Server },

  // Home can be prerendered safely
  { path: 'explore', renderMode: RenderMode.Prerender },

  // Parameterized routes prerendered with fallback to Server for non-listed ids
  // Areas list (static)
  { path: 'areas', renderMode: RenderMode.Prerender },
  // Area detail by slug (no country)
  {
    path: 'area/:areaSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      // No predefined params; let SSR handle dynamic requests
      return [];
    },
  },
  {
    path: 'profile',
    renderMode: RenderMode.Server,
  },
  {
    path: 'profile/:id',
    renderMode: RenderMode.Server,
  },

  {
    path: 'area/:areaSlug/:cragSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      // No static prerender by default; we delegate to SSR
      return [];
    },
  },
  {
    path: 'area/:areaSlug/:cragSlug/topo/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      return [];
    },
  },
  {
    path: 'admin/users',
    renderMode: RenderMode.Server,
  },
  {
    path: 'admin/equippers',
    renderMode: RenderMode.Server,
  },
  {
    path: 'area/:areaSlug/:cragSlug/:routeSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      // SSR handles dynamic routes for single climbings for now
      return [];
    },
  },
  {
    path: 'page-not-found',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
    headers: { Location: '/page-not-found' },
    status: 302,
  },
];
