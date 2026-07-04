import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-print-menus-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './print-menus-page.html',
  styleUrl: './restaurant-california-page.css',
})
export class PrintMenusPageComponent {
  readonly year = new Date().getFullYear();

  constructor(private seo: SeoService) {
    this.seo.setPage({
      title: 'How to Print Menus for Restaurants | NexMenus',
      description:
        'Learn how to create printable restaurant menus that look clean, stay readable, and match your QR menu and online menu.',
      canonicalPath: '/blog/how-to-print-menus-for-restaurants/',
      type: 'article',
    });

    this.seo.addJsonLd('nx-print-menus-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'How to Print Menus for Restaurants',
      description:
        'A practical guide to creating printable restaurant menus, including layout, paper size, pricing, QR codes, and update workflow.',
      author: {
        '@type': 'Organization',
        name: 'NexMenus',
      },
      publisher: {
        '@type': 'Organization',
        name: 'NexMenus',
        logo: {
          '@type': 'ImageObject',
          url: 'https://nexmenus.com/static/favicon/android-chrome-512x512.png',
        },
      },
      mainEntityOfPage: 'https://nexmenus.com/blog/how-to-print-menus-for-restaurants/',
    });
  }
}
