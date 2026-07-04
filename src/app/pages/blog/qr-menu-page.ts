import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-qr-menu-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './qr-menu-page.html',
  styleUrl: './restaurant-california-page.css',
})
export class QrMenuPageComponent {
  readonly year = new Date().getFullYear();

  constructor(private seo: SeoService) {
    this.seo.setPage({
      title: 'How to Make a Free QR Code Menu for Your Restaurant | NexMenus',
      description:
        'Learn how to make a free QR code menu for your restaurant, with tips that also work for cafes, bars, food trucks, bakeries, pop-ups, and catering businesses.',
      canonicalPath: '/blog/how-to-make-free-qr-code-menu-for-your-restaurant/',
      type: 'article',
    });

    this.seo.addJsonLd('nx-qr-menu-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'How to Make a Free QR Code Menu for Your Restaurant',
      description:
        'A practical guide to creating a free QR code menu for restaurants and other food businesses, including menu links, QR code placement, testing, updates, and printable backups.',
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
      mainEntityOfPage: 'https://nexmenus.com/blog/how-to-make-free-qr-code-menu-for-your-restaurant/',
    });
  }
}
