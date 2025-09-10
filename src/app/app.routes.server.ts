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
    headers: { Location: '/home' },
    status: 302,
  },

  { path: 'login', renderMode: RenderMode.Server },

  // Home can be prerendered safely
  { path: 'home', renderMode: RenderMode.Prerender },

  // Parameterized routes prerendered with fallback to Server for non-listed ids
  {
    path: 'zone/:countrySlug/:areaSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      const global = inject(GlobalData);
      const area = global.area();
      return area ? [{ areaSlug: area.areaSlug }] : [];
    },
  },
  {
    path: 'crag/:countrySlug/:cragSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      const global = inject(GlobalData);
      const crag = global.crag();
      return crag
        ? [
            {
              countrySlug: crag?.countrySlug,
              cragSlug: crag?.cragSlug,
            },
          ]
        : [];
    },
  },
  {
    path: 'topo/:countrySlug/:cragSlug/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      const global = inject(GlobalData);
      const crag = global.crag();
      return crag
        ? [
            {
              countrySlug: crag.countrySlug,
              cragSlug: crag.cragSlug,
              id: '', // TODO: Topos
            },
          ]
        : [];
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
    path: 'route/:countrySlug/:cragSlug/sector/:sectorSlug/:zlaggableId',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      const global = inject(GlobalData);
      const route = global.route();
      return route
        ? [
            {
              zlaggableId: `${route.zlaggableId}`,
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
