import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-terms-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './terms-page.html',
  styleUrl: './terms-page.css',
})
export class TermsPageComponent {
  readonly year = new Date().getFullYear();

  constructor() {
    inject(SeoService).setPage({
      title: 'Terms of Service | NexMenus',
      description:
        'Read the NexMenus Terms of Service covering accounts, subscriptions, acceptable use, and how the menu platform may be used.',
      canonicalPath: '/terms',
    });
  }
}
