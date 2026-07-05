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
      title: 'How to Print a Restaurant Menu (Step-by-Step Tutorial) | NexMenus',
      description:
        'Step-by-step tutorial with screenshots: build your menu online, open the print-ready view, save a clean PDF, and print it — updates take minutes, not a redesign.',
      canonicalPath: '/blog/how-to-print-menus-for-restaurants/',
      type: 'article',
    });

    this.seo.addJsonLd('nx-print-menus-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'How to Print a Restaurant Menu (Step-by-Step)',
      description:
        'A step-by-step tutorial with screenshots covering how to print a restaurant menu: print-ready layout, saving as PDF, paper size, and the reprint workflow.',
      image: [
        'https://nexmenus.com/blog/print-tutorial-print-view.webp',
        'https://nexmenus.com/blog/print-tutorial-pdf-result.webp',
      ],
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

    this.seo.addJsonLd('nx-print-menus-howto-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to print a restaurant menu',
      description:
        'Build the menu online, open the print-ready view, save it as a PDF, and print it in-house or at a print shop.',
      totalTime: 'PT10M',
      tool: [{ '@type': 'HowToTool', name: 'A web browser' }],
      step: [
        {
          '@type': 'HowToStep',
          name: 'Build your menu online',
          text: 'Create a free NexMenus account and add your categories, items, prices, and short descriptions.',
          url: 'https://nexmenus.com/blog/how-to-print-menus-for-restaurants/#step-1',
        },
        {
          '@type': 'HowToStep',
          name: 'Open the print view',
          text: 'On your live menu page, click the printer icon in the top-right corner to switch to the ink-friendly paper layout.',
          url: 'https://nexmenus.com/blog/how-to-print-menus-for-restaurants/#step-2',
          image: 'https://nexmenus.com/blog/print-tutorial-live-menu.webp',
        },
        {
          '@type': 'HowToStep',
          name: 'Save it as a PDF',
          text: 'Click Print / Save as PDF, choose "Save as PDF" as the destination, pick Letter or A4 paper, and turn off headers and footers.',
          url: 'https://nexmenus.com/blog/how-to-print-menus-for-restaurants/#step-3',
          image: 'https://nexmenus.com/blog/print-tutorial-print-view.webp',
        },
        {
          '@type': 'HowToStep',
          name: 'Print a test batch',
          text: 'Print one copy in-house to check readability, then print the batch on heavier paper or send the PDF to a local print shop.',
          url: 'https://nexmenus.com/blog/how-to-print-menus-for-restaurants/#step-4',
          image: 'https://nexmenus.com/blog/print-tutorial-pdf-result.webp',
        },
      ],
    });
  }
}
