import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { MenuBuilderComponent } from '../../components/menu-builder/menu-builder';
import { SeoService } from '../../services/seo.service';

const SITE = 'https://nexmenus.com';

// Must mirror the FAQ section visible on the page — Google requires FAQPage
// markup to describe content users can actually see.
const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is there a free AI menu generator for restaurants?',
    a: 'Yes. NexMenus is a free AI menu generator: tell it your business name, cuisine, and city, and it writes your item descriptions, about section, and FAQ, suggests a matching theme, and publishes a live menu page in minutes — no credit card required.',
  },
  {
    q: 'What can NexMenus AI write for me?',
    a: "NexMenus AI can generate menu item descriptions, your restaurant's About section, cuisine and category copy, a FAQ section, and a matching color theme — all editable before you publish.",
  },
  {
    q: 'Can I print my menu?',
    a: 'Yes. NexMenus generates a print-ready PDF of your menu — a clean, ink-friendly layout for tables, takeout counters, events, laminating, or guests who prefer paper. It always matches your digital menu.',
  },
  {
    q: 'Is NexMenus free to use?',
    a: 'Yes. NexMenus is free to launch — you can create your menu, print it, and share it without a credit card.',
  },
  {
    q: 'Can I make a QR code menu with NexMenus?',
    a: 'Yes. Every menu gets a public link and QR code that guests can scan from table tents, printed signs, your website, or social media.',
  },
  {
    q: 'Do guests need to download an app?',
    a: "No. Guests open your menu from a normal web link or QR code in their phone's browser — nothing to install.",
  },
  {
    q: 'Can I update prices and sold-out items?',
    a: 'Yes. Update prices, descriptions, photos, and sold-out items from one place — even from your phone — and your printable and digital menus stay aligned.',
  },
  {
    q: 'Can I add photos to my menu?',
    a: 'Yes. NexMenus is designed for photo-forward menus, so you can show dishes visually and help guests decide what to order.',
  },
  {
    q: 'Who is NexMenus for?',
    a: 'Restaurants, cafes, bakeries, food trucks, bars, caterers, pop-ups, and any food business that needs a simple menu it can keep current — in print and online.',
  },
];

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, BrandLogoComponent, MenuBuilderComponent],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
})
export class LandingPageComponent {
  readonly year = new Date().getFullYear();

  constructor(private seo: SeoService) {
    this.seo.setPage({
      title: 'Free AI Menu Generator for Restaurants | NexMenus',
      description:
        'NexMenus is a free AI menu generator for restaurants. Enter your business name, cuisine, and dishes — AI writes your descriptions, about page, FAQ, and even picks a matching theme. Get a live mobile menu, QR code, and print-ready PDF in minutes.',
      ogDescription:
        'Turn your dish list into an organized restaurant menu with AI-written descriptions, about copy, FAQ, and theme — then publish a mobile menu, QR code, and printable PDF. Free, no credit card.',
      twitterDescription:
        'Turn your dish list into an organized restaurant menu with AI — descriptions, about page, FAQ, and theme included. Free to launch.',
      canonicalPath: '/',
    });

    this.seo.addJsonLd('nx-landing-jsonld', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SITE}/#organization`,
          name: 'NexMenus',
          legalName: 'Galvan Digital LLC',
          url: `${SITE}/`,
          logo: `${SITE}/static/favicon/android-chrome-512x512.png`,
          description:
            'NexMenus is an AI menu generator and storefront builder for restaurants, cafes, food trucks, and bars.',
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'contact@nexmenus.com',
          },
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE}/#website`,
          url: `${SITE}/`,
          name: 'NexMenus',
          publisher: { '@id': `${SITE}/#organization` },
        },
        {
          '@type': 'WebPage',
          '@id': `${SITE}/#webpage`,
          url: `${SITE}/`,
          name: 'Free AI Menu Generator for Restaurants | NexMenus',
          description:
            'NexMenus is a free AI menu generator for restaurants. Enter your business name, cuisine, and dishes — AI writes your descriptions, about page, FAQ, and even picks a matching theme. Get a live mobile menu, QR code, and print-ready PDF in minutes.',
          isPartOf: { '@id': `${SITE}/#website` },
          about: { '@id': `${SITE}/#software` },
        },
        {
          '@type': 'SoftwareApplication',
          '@id': `${SITE}/#software`,
          name: 'NexMenus AI Menu Generator',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          url: `${SITE}/`,
          description:
            'A free AI menu generator for restaurants. Enter your business name, cuisine, and dishes and NexMenus AI writes item descriptions, an about section, an FAQ, and picks a matching theme, then publishes a live digital menu, QR code, and matching print-ready PDF.',
          publisher: { '@id': `${SITE}/#organization` },
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            reviewCount: '2000',
          },
        },
        {
          '@type': 'FAQPage',
          '@id': `${SITE}/#faq`,
          mainEntity: FAQS.map(({ q, a }) => ({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          })),
        },
      ],
    });
  }
}
