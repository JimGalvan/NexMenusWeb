import { Injectable, computed, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Single source of truth for tier copy and the upgrade destination, so the
 * price shown on the pricing page, the account page and every upgrade nudge
 * can never drift apart.
 *
 * Billing is deliberately manual: "upgrade" opens a conversation, a human
 * sends a payment link, and the plan is flipped by hand. Nothing here charges
 * anyone.
 */
@Injectable({ providedIn: 'root' })
export class PlanService {
  private auth = inject(AuthService);

  /** Menus included on the free tier. Mirrors the API's `plans.free.max-menus`. */
  readonly freeMenuLimit = 1;

  readonly proPrice = '$9';
  readonly proPeriod = 'month';
  readonly proPriceLabel = `${this.proPrice}/mo`;

  readonly isPro = this.auth.isPro;
  readonly plan = this.auth.plan;
  readonly planLabel = computed(() => (this.isPro() ? 'Pro' : 'Free'));

  /**
   * How long someone waits after asking to upgrade. Stated wherever the
   * upgrade link appears — a hand-off to a human inbox reads as broken unless
   * the wait is set out loud.
   */
  readonly upgradeResponseTime = 'within one business day';

  /** When a Pro plan is next due, or null. Manual billing, so this is set by hand. */
  readonly renewsAt = computed(() => this.auth.account()?.planRenewsAt ?? null);

  private readonly supportEmail = environment.supportEmail.trim();

  /**
   * Where "Upgrade to Pro" goes. A configured `UPGRADE_URL` wins, so billing
   * can move to a hosted form or payment link without a code change; otherwise
   * a prefilled email carrying the account address, so the request arrives with
   * enough to act on.
   */
  readonly upgradeHref = computed(() => {
    const configured = environment.upgradeUrl?.trim();
    if (configured) return configured;
    if (!this.supportEmail) return null;

    const email = this.auth.account()?.email ?? '';
    const subject = 'Upgrade to NexMenus Pro';
    const body = [
      `I'd like to upgrade to Pro (${this.proPriceLabel}).`,
      '',
      email ? `Account: ${email}` : 'Account: (the email I signed up with)',
    ].join('\n');
    return `mailto:${this.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  /** Whether an upgrade route exists at all; false when nothing is configured. */
  readonly canUpgrade = computed(() => !!this.upgradeHref());
}
