import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-digital-menu-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './digital-menu-page.html',
  styleUrl: './restaurant-california-page.css',
})
export class DigitalMenuPageComponent {
  readonly year = new Date().getFullYear();

  constructor(private seo: SeoService) {
    this.seo.setPage({
      title: 'How to Make a Free Digital Menu for Your Restaurant | NexMenus',
      description:
        'Learn how to make a free digital menu for your restaurant, publish it online, share it with a QR code, and keep your menu current from one editor.',
      canonicalPath: '/blog/how-to-make-free-digital-menu-for-your-restaurant/',
      type: 'article',
    });

    this.seo.addJsonLd('nx-digital-menu-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'How to Make a Free Digital Menu for Your Restaurant',
      description:
        'A practical guide to creating a free digital restaurant menu, including menu structure, photos, QR sharing, updates, and printable menu backups.',
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
      mainEntityOfPage: 'https://nexmenus.com/blog/how-to-make-free-digital-menu-for-your-restaurant/',
    });
  }
}
