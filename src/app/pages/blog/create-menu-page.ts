import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-create-menu-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './create-menu-page.html',
  styleUrl: './restaurant-california-page.css',
})
export class CreateMenuPageComponent {
  readonly year = new Date().getFullYear();

  constructor(private seo: SeoService) {
    this.seo.setPage({
      title: 'How to Create a Restaurant Menu Online (Step-by-Step) | NexMenus',
      description:
        'Step-by-step tutorial with screenshots: create a restaurant menu online for free — add categories, items, prices, and photos, then share it as a QR menu, web menu, or printable PDF.',
      canonicalPath: '/blog/how-to-create-a-restaurant-menu/',
      type: 'article',
    });

    this.seo.addJsonLd('nx-create-menu-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'How to Create a Restaurant Menu Online (Step-by-Step)',
      description:
        'A step-by-step tutorial with screenshots covering how to create a restaurant menu online: categories, items, prices, photos, and sharing it as a QR menu or printable PDF.',
      image: [
        'https://nexmenus.com/blog/create-tutorial-editor.webp',
        'https://nexmenus.com/blog/create-tutorial-live-menu.webp',
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
      mainEntityOfPage: 'https://nexmenus.com/blog/how-to-create-a-restaurant-menu/',
    });

    this.seo.addJsonLd('nx-create-menu-howto-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to create a restaurant menu online',
      description:
        'Create a free account, name your menu, add categories and items with prices and photos, then share the live menu as a QR code, link, or printable PDF.',
      totalTime: 'PT20M',
      tool: [{ '@type': 'HowToTool', name: 'A web browser' }],
      step: [
        {
          '@type': 'HowToStep',
          name: 'Create your menu',
          text: 'Sign up free, click "Create new menu", give the menu a name, and pick your market for currency formatting.',
          url: 'https://nexmenus.com/blog/how-to-create-a-restaurant-menu/#step-1',
          image: 'https://nexmenus.com/blog/create-tutorial-create-dialog.webp',
        },
        {
          '@type': 'HowToStep',
          name: 'Add your categories',
          text: 'In the editor, open Manage next to Categories and add sections like Appetizers, Mains, Drinks, and Desserts.',
          url: 'https://nexmenus.com/blog/how-to-create-a-restaurant-menu/#step-2',
        },
        {
          '@type': 'HowToStep',
          name: 'Add items with prices and photos',
          text: 'Click Add item, then enter the name, price, a one-sentence description, pick the category, and optionally add a photo.',
          url: 'https://nexmenus.com/blog/how-to-create-a-restaurant-menu/#step-3',
          image: 'https://nexmenus.com/blog/create-tutorial-add-item.webp',
        },
        {
          '@type': 'HowToStep',
          name: 'Add restaurant details and preview',
          text: 'Switch to the Details tab to add your address, phone, and hours, then use Preview to see the menu exactly as guests will.',
          url: 'https://nexmenus.com/blog/how-to-create-a-restaurant-menu/#step-4',
          image: 'https://nexmenus.com/blog/create-tutorial-live-menu.webp',
        },
        {
          '@type': 'HowToStep',
          name: 'Share your menu',
          text: 'From Share & Print, download the QR code, copy the menu link, or export the printable PDF menu.',
          url: 'https://nexmenus.com/blog/how-to-create-a-restaurant-menu/#step-5',
          image: 'https://nexmenus.com/blog/create-tutorial-share-qr.webp',
        },
      ],
    });
  }
}
