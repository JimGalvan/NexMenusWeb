import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { PlanService } from '../../services/plan.service';

@Component({
  selector: 'app-account-page',
  imports: [RouterLink],
  templateUrl: './account-page.html',
  styleUrl: './account-page.css',
})
export class AccountPageComponent {
  private authService = inject(AuthService);
  readonly plans = inject(PlanService);

  readonly account = this.authService.account;
  readonly email = computed(() => this.account()?.email ?? '');
  // The accounts API has no display name, so derive one from the email local part.
  readonly name = computed(() => this.email().split('@')[0] || 'Your account');
  readonly initials = computed(() => this.email().slice(0, 2).toUpperCase() || 'NX');
  readonly supportEmail = environment.supportEmail.trim();
  readonly supportHref = `mailto:${this.supportEmail}?subject=${encodeURIComponent('NexMenus support request')}`;

  /**
   * Renewal date in the reader's locale, or empty when none is recorded — a Pro
   * account granted without an end date must not render "Invalid Date".
   */
  readonly renewsLabel = computed(() => {
    const iso = this.plans.renewsAt();
    if (!iso) return '';
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  });

  logout() {
    this.authService.logout();
  }
}
