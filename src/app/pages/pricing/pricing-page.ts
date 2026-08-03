import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { AuthService } from '../../services/auth.service';
import { PlanService } from '../../services/plan.service';
import { SeoService } from '../../services/seo.service';

/**
 * Public pricing. Live from launch even though nobody has paid yet: showing the
 * price from the first signup is what stops Pro ever landing on people as a
 * surprise later.
 *
 * There is no checkout. "Upgrade" opens a conversation, a payment link is sent
 * by hand, and the plan is flipped manually — so the copy here has to be
 * explicit about that rather than implying instant self-serve.
 */
@Component({
  selector: 'app-pricing-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './pricing-page.html',
  styleUrl: './pricing-page.css',
})
export class PricingPageComponent {
  readonly year = new Date().getFullYear();
  readonly plans = inject(PlanService);
  readonly isAuthenticated = inject(AuthService).isAuthenticated;

  readonly freeFeatures = [
    'One menu, unlimited items and categories',
    'Photos on every dish',
    'Public menu link and QR code',
    'Printable, always-current menu',
    'AI menu generator',
    'Works on any phone — no app for your guests',
  ];

  readonly proFeatures = [
    'Everything in Free',
    'Unlimited menus — one per location or service',
    'No NexMenus badge on your public menu',
    'Clean, unbranded printable menu',
    'Choose your own menu link',
    'Priority support',
  ];

  constructor() {
    inject(SeoService).setPage({
      title: 'Pricing | NexMenus',
      description:
        'NexMenus pricing: a free plan with one menu, QR code and printable menu, and Pro at $9/month for unlimited menus, your own link and no NexMenus badge.',
      canonicalPath: '/pricing',
    });
  }
}
