import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, finalize, map, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Account,
  AuthTokens,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
} from '../models/auth.model';

const REFRESH_KEY = 'nx_refresh';
const ACCOUNT_KEY = 'nx_account';

/**
 * Real Accounts API client (docs/accounts-api-contract.md).
 *
 * Token model: the short-lived access JWT is kept in memory only; the rotating
 * refresh token and the resolved account are persisted so the session survives
 * a page reload. On reload the access token is absent, so the first protected
 * request 401s and the interceptor transparently refreshes (see authInterceptor).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly api = `${environment.apiBaseUrl}/api/${environment.apiVersion}`;

  private accessToken = signal<string | null>(null);
  private refreshToken = signal<string | null>(localStorage.getItem(REFRESH_KEY));
  readonly account = signal<Account | null>(readStoredAccount());

  // A session exists when we still hold a refresh token; the access token is
  // re-minted on demand. The account is hydrated lazily after a reload.
  readonly isAuthenticated = computed(() => !!this.refreshToken());
  getToken = () => this.accessToken();

  // Single-flight refresh: concurrent 401s share one request because the
  // refresh token is single-use and rotates on every successful refresh.
  private refresh$: Observable<string> | null = null;

  login(body: LoginRequest): Observable<Account> {
    return this.http.post<AuthTokens>(`${this.api}/auth/login`, body).pipe(
      tap(tokens => this.storeTokens(tokens)),
      switchMap(() => this.loadCurrentAccount()),
    );
  }

  register(body: RegisterRequest): Observable<Account> {
    // Registration does not log the user in, so chain a login afterward.
    return this.http
      .post<Account>(`${this.api}/accounts`, body)
      .pipe(switchMap(() => this.login(body)));
  }

  loadCurrentAccount(): Observable<Account> {
    return this.http
      .get<Account>(`${this.api}/accounts/me`)
      .pipe(tap(account => this.storeAccount(account)));
  }

  changePassword(body: ChangePasswordRequest): Observable<void> {
    // A successful change revokes the refresh token; force re-authentication.
    return this.http.put<void>(`${this.api}/accounts/password`, body).pipe(
      tap(() => this.clearSession()),
      map(() => undefined),
    );
  }

  refreshSession(): Observable<string> {
    if (this.refresh$) return this.refresh$;

    const current = this.refreshToken();
    if (!current) {
      return throwError(() => new Error('No refresh token available.'));
    }

    this.refresh$ = this.http
      .post<AuthTokens>(`${this.api}/auth/refresh`, { refreshToken: current })
      .pipe(
        tap(tokens => this.storeTokens(tokens)),
        map(tokens => tokens.token),
        finalize(() => (this.refresh$ = null)),
        shareReplay(1),
      );
    return this.refresh$;
  }

  logout(): void {
    const done = () => {
      this.clearSession();
      this.router.navigate(['/login']);
    };
    // Best-effort server-side revoke; clear locally regardless of the outcome.
    this.http.post<void>(`${this.api}/auth/logout`, {}).pipe(finalize(done)).subscribe({
      error: () => {},
    });
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.account.set(null);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
  }

  private storeTokens(tokens: AuthTokens): void {
    this.accessToken.set(tokens.token);
    this.refreshToken.set(tokens.refreshToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  }

  private storeAccount(account: Account): void {
    this.account.set(account);
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  }
}

function readStoredAccount(): Account | null {
  const raw = localStorage.getItem(ACCOUNT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Account;
  } catch {
    return null;
  }
}
