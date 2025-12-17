import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { inject } from '@angular/core';
import { GlobalData } from '../services';

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
    path: 'crag/:cragSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      const global = inject(GlobalData);
      const crag = global.crag();
      return crag ? [{ cragSlug: (crag as any)?.cragSlug }] : [];
    },
  },
  {
    path: 'sector/:countrySlug/:cragSlug/:sectorSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      // No static params; prerender will be empty and fallback to Server
      return [];
    },
  },
  {
    path: 'route/:countrySlug/:cragSlug/sector/:sectorSlug/:zlaggableSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      const global = inject(GlobalData);
      const route = global.route();
      return route
        ? [
            {
              zlaggableSlug: `${route.zlaggableSlug}`,
            },
          ]
        : [];
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
