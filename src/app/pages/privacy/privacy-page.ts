import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './privacy-page.html',
  styleUrl: '../terms/terms-page.css',
})
export class PrivacyPageComponent {
  readonly year = new Date().getFullYear();

  constructor() {
    inject(SeoService).setPage({
      title: 'Privacy Policy | NexMenus',
      description:
        'Read the NexMenus Privacy Policy covering what information we collect, how we use it, cookies, data retention, and your privacy rights.',
      canonicalPath: '/privacy',
    });
  }
}
