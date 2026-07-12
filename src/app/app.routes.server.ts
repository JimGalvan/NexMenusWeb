import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Public, SEO-relevant routes are server-rendered at request time so crawlers
 * (and social scrapers) receive full HTML — including the menu content fetched
 * from the API. Authenticated and print routes stay client-rendered: they
 * depend on browser-only session state (localStorage) or window.print().
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Server },
  { path: 'login', renderMode: RenderMode.Server },
  { path: 'register', renderMode: RenderMode.Server },
  { path: 'terms', renderMode: RenderMode.Server },
  { path: 'privacy', renderMode: RenderMode.Server },
  { path: 'support', renderMode: RenderMode.Server },
  { path: 'blog', renderMode: RenderMode.Server },
  { path: 'blog/**', renderMode: RenderMode.Server },
  { path: 'm/:slug', renderMode: RenderMode.Server },
  { path: 'm/:slug/print', renderMode: RenderMode.Client },
  // Tokenized private draft pages: client-only so credentials stay out of SSR.
  { path: 'claim/:token', renderMode: RenderMode.Client },
  { path: 'preview/:token', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client },
];
