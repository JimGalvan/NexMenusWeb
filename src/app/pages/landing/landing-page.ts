import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
})
export class LandingPageComponent {
  readonly year = new Date().getFullYear();

  constructor(private seo: SeoService) {
    this.seo.setPage({
      title: 'Printable Restaurant Menus & Digital QR Menus | NexMenus',
      description:
        'Create printable restaurant menus and digital QR menus from one simple editor. Update prices, photos, and sold-out items once, then share online or print a clean PDF.',
      canonicalPath: '/',
    });

    this.seo.addJsonLd('nx-landing-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'NexMenus',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://nexmenus.com/',
      description:
        'NexMenus helps restaurants create printable menus, print-ready PDFs, digital QR menus, and live online menus from one editor.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      audience: {
        '@type': 'Audience',
        audienceType: 'Restaurants',
      },
    });
  }
}
