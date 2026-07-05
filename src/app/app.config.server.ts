import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideHttpClient, withInterceptors, HttpInterceptorFn } from '@angular/common/http';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { authInterceptor } from './core/interceptors/auth.interceptor';

/**
 * In production the browser calls the API with relative `/api/...` URLs
 * (same-origin), but during SSR there is no origin to resolve against, so
 * relative requests must be rewritten to the backend's absolute URL. The
 * backend origin comes from API_BASE_URL — the same env var server.ts uses
 * for QR redirects.
 */
const serverApiBaseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/')) return next(req);
  const base = (process.env['API_BASE_URL'] ?? 'http://localhost:8080').replace(/\/$/, '');
  return next(req.clone({ url: `${base}${req.url}` }));
};

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Re-provided to prepend the base-URL rewrite before the auth interceptor.
    provideHttpClient(withInterceptors([serverApiBaseUrlInterceptor, authInterceptor])),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
