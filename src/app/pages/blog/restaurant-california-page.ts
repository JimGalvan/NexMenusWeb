import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-restaurant-california-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './restaurant-california-page.html',
  styleUrl: './restaurant-california-page.css',
})
export class RestaurantCaliforniaPageComponent {
  readonly year = new Date().getFullYear();

  constructor(private seo: SeoService) {
    this.seo.setPage({
      title: 'How to Start a Restaurant in California | NexMenus',
      description:
        'A practical checklist for opening a restaurant in California, from permits and food safety to launch menus, printed menus, and QR menus.',
      canonicalPath: '/blog/how-to-start-restaurant-california/',
      type: 'article',
    });

    this.seo.addJsonLd('nx-restaurant-california-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'How to Start a Restaurant in California',
      description:
        'A practical checklist for opening a restaurant in California, including business setup, permits, food safety, menus, and launch prep.',
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
      mainEntityOfPage: 'https://nexmenus.com/blog/how-to-start-restaurant-california/',
    });
  }
}
