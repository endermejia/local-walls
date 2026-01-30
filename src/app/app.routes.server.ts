import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'home', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'explore', renderMode: RenderMode.Prerender },
  {
    path: 'profile',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'profile/config',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'profile/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      return [];
    },
  },
  { path: 'area', renderMode: RenderMode.Prerender },
  {
    path: 'area/:areaSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      return [];
    },
  },
  {
    path: 'area/:areaSlug/:cragSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
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
    path: 'area/:areaSlug/:cragSlug/:routeSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      return [];
    },
  },
  // ADMIN
  {
    path: 'admin',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'my-areas',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/users',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/equippers',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/parkings',
    renderMode: RenderMode.Prerender,
  },
  // Fallback routes
  {
    path: '',
    renderMode: RenderMode.Server,
    headers: { Location: '/home' },
    status: 302,
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
