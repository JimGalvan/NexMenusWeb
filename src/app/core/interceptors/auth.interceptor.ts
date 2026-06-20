import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';

// Endpoints that establish/rotate the session themselves: never attach a
// stale token or trigger the refresh-retry loop for these.
function isSessionEndpoint(url: string, method: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    (url.endsWith('/accounts') && method === 'POST')
  );
}

/**
 * Attaches the bearer token and, on a 401 from a protected request, performs a
 * single shared refresh and retries the request once. If the refresh fails the
 * session is cleared and the user is sent to the login screen.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const sessionEndpoint = isSessionEndpoint(req.url, req.method);
  const token = authService.getToken();
  const authReq =
    token && !sessionEndpoint
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || sessionEndpoint) {
        return throwError(() => error);
      }
      return authService.refreshSession().pipe(
        switchMap(newToken =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })),
        ),
        catchError(refreshError => {
          authService.clearSession();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
