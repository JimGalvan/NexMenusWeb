import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DraftService } from '../../services/draft.service';
import { MenuBuilderSessionService } from '../../services/menu-builder-session.service';
import { SeoService } from '../../services/seo.service';
import { DraftClaimStatus } from '../../models/draft.model';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';

type ClaimState =
  | 'loading'
  | 'unclaimed'
  | 'claimed'
  | 'expired'
  | 'invalid'
  | 'claiming'
  | 'unavailable';

/**
 * Landing page for the one-time claim link handed out by ChatGPT. Shows the
 * draft summary, routes unauthenticated visitors through login/registration
 * (preserving the claim URL as returnUrl), and performs the explicit claim
 * confirmation. The token never leaves this page except to the API.
 */
@Component({
  selector: 'app-claim-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './claim-page.html',
  styleUrl: './claim-page.css',
})
export class ClaimPageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private draftService = inject(DraftService);
  private builderSession = inject(MenuBuilderSessionService);
  private seo = inject(SeoService);
  readonly auth = inject(AuthService);

  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';
  readonly state = signal<ClaimState>('loading');
  readonly status = signal<DraftClaimStatus | null>(null);
  readonly claimError = signal('');

  readonly returnParams = { returnUrl: `/claim/${this.token}` };
  readonly displayName = computed(() => {
    const value = this.status();
    return value?.businessName || value?.menuName || 'your menu';
  });
  readonly expiresText = computed(() => {
    const iso = this.status()?.expiresAt;
    if (!iso) return '';
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  });

  constructor() {
    this.seo.setPage({
      title: 'Claim your menu | NexMenus',
      description: 'Claim the menu draft you created with ChatGPT.',
      noindex: true,
    });
    if (!this.token) {
      this.state.set('invalid');
      return;
    }
    this.loadStatus().subscribe({
      next: status => {
        this.status.set(status);
        // A spent or dead link must stop being offered by the builder's resume
        // banner, or the visitor is sent back here every time they return.
        if (status.status === 'claimed' || status.status === 'expired') {
          this.builderSession.clearForClaimToken(this.token);
        }
        // The owner returning to their own spent link goes to the menu it became.
        if (status.status === 'claimed' && status.claimedMenuId) {
          this.router.navigate(['/editor', status.claimedMenuId], { replaceUrl: true });
          return;
        }
        this.state.set(
          status.status === 'unclaimed' ? 'unclaimed'
            : status.status === 'claimed' ? 'claimed'
            : status.status === 'expired' ? 'expired'
            : 'invalid');
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 410) this.builderSession.clearForClaimToken(this.token);
        this.state.set(error.status === 503 ? 'unavailable' : error.status === 410 ? 'expired' : 'invalid');
      },
    });
  }

  /**
   * Every real route into this page is a cold page load — the ChatGPT link, the
   * builder's resume banner, a bookmark — and the access token only lives in
   * memory, so it is absent here. The status GET is public, so nothing 401s and
   * the interceptor never refreshes: without this the signed-in owner looks
   * anonymous to the API and is told their own link is dead. Refresh failures
   * fall through anonymously so the page still renders its sign-in path.
   */
  private loadStatus(): Observable<DraftClaimStatus> {
    const request = () => this.draftService.getClaimStatus(this.token);
    if (!this.auth.isAuthenticated() || this.auth.getToken()) return request();
    return this.auth.refreshSession().pipe(
      catchError(() => of(null)),
      switchMap(request),
    );
  }

  claim() {
    if (this.state() !== 'unclaimed' || !this.auth.isAuthenticated()) return;
    this.state.set('claiming');
    this.claimError.set('');
    this.draftService.claim(this.token).subscribe({
      next: result => {
        this.builderSession.clearForClaimToken(this.token);
        // replaceUrl: the spent claim link must not sit in history, or Back out
        // of the editor lands on "Already claimed".
        this.router.navigate(['/editor', result.menuId], { replaceUrl: true });
      },
      error: (error: HttpErrorResponse) => {
        const code = error.error?.code;
        if (code === 'ALREADY_CLAIMED') {
          this.builderSession.clearForClaimToken(this.token);
          this.state.set('claimed');
          return;
        }
        if (code === 'DRAFT_EXPIRED') {
          this.builderSession.clearForClaimToken(this.token);
          this.state.set('expired');
          return;
        }
        this.state.set('unclaimed');
        this.claimError.set(
          code === 'DRAFT_NOT_READY'
            ? 'This draft is missing required content. Go back to ChatGPT to finish it, then try again.'
            : 'Something went wrong claiming your menu. Please try again.');
      },
    });
  }
}
