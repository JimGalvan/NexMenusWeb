import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { SeoService } from '../../services/seo.service';

const URL = 'https://nexmenus.com/blog/best-ai-menu-generator/';
const TITLE = 'Best AI Menu Generator for Restaurants in 2026 | NexMenus';
const DESCRIPTION = 'Compare what matters in an AI menu generator, then create an organized, shareable restaurant menu with descriptions, QR code, and print options.';

@Component({
  selector: 'app-best-ai-menu-generator-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './best-ai-menu-generator-page.html',
  styleUrl: './best-ai-menu-generator-page.css',
})
export class BestAiMenuGeneratorPageComponent {
  readonly year = new Date().getFullYear();

  constructor(private seo: SeoService) {
    this.seo.setPage({ title: TITLE, description: DESCRIPTION, canonicalPath: '/blog/best-ai-menu-generator/', type: 'article' });
    this.seo.addJsonLd('nx-best-ai-menu-article', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Best AI Menu Generator for Restaurants in 2026',
      description: DESCRIPTION,
      author: { '@type': 'Organization', name: 'NexMenus' },
      publisher: { '@type': 'Organization', name: 'NexMenus', logo: { '@type': 'ImageObject', url: 'https://nexmenus.com/static/favicon/android-chrome-512x512.png' } },
      mainEntityOfPage: URL,
      dateModified: '2026-07-12',
    });
    this.seo.addJsonLd('nx-best-ai-menu-breadcrumbs', {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://nexmenus.com/' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://nexmenus.com/blog/' },
        { '@type': 'ListItem', position: 3, name: 'Best AI Menu Generator for Restaurants in 2026', item: URL },
      ],
    });
    this.seo.addJsonLd('nx-best-ai-menu-faq', {
      '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What is the best AI menu generator?', acceptedAnswer: { '@type': 'Answer', text: 'The best choice is the one that helps you create a clear menu quickly, then lets you edit it and share it as a mobile-friendly link, QR code, and printable menu. NexMenus is designed around that workflow for food businesses.' } },
        { '@type': 'Question', name: 'Can AI create a restaurant menu?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. AI can organize dishes into categories and draft descriptions from the business details, item names, and prices you provide. Review the result before publishing.' } },
        { '@type': 'Question', name: 'Can I edit the menu after AI generates it?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. NexMenus menus can be reviewed and edited before publishing, including item names, descriptions, prices, categories, and business details.' } },
        { '@type': 'Question', name: 'Can I create a QR-code menu?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. NexMenus provides a shareable online restaurant menu and a QR code that points guests to it.' } },
        { '@type': 'Question', name: 'Can I make a printable or PDF menu?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. NexMenus creates a printable restaurant menu PDF from the same menu used for the online and QR menu.' } },
        { '@type': 'Question', name: 'Do I need an account to create a menu?', acceptedAnswer: { '@type': 'Answer', text: 'You can begin creating a menu with AI before claiming it. Claiming the draft into a free account lets you keep editing and publish it.' } },
      ],
    });
  }
}