import { Component, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { MenuBuilderComponent } from '../../components/menu-builder/menu-builder';
import { PublicMenu, withDraftPlaceholders } from '../../models/menu.model';
import { EXAMPLE_MENU } from './example-menu';
import { PublicMenuPageComponent } from '../public-menu/public-menu-page';
import { DraftService } from '../../services/draft.service';
import { SeoService } from '../../services/seo.service';

type BuilderStep = 'business' | 'items' | 'preview';
type PreviewState = 'example' | 'loading' | 'ready' | 'error';
type MobileTab = 'builder' | 'preview';

const SITE = 'https://nexmenus.com';
const PAGE = `${SITE}/ai-menu-generator`;

const FAQS = [
  {
    q: 'Is the NexMenus AI menu generator free?',
    a: 'Yes. You can start an AI-assisted restaurant menu, review the generated draft, and see the live menu preview without entering a credit card.',
  },
  {
    q: 'What information should I provide?',
    a: 'Start with your business name, business type, and city. Then add dish names and prices in plain language. Ingredients, preparation details, hours, and contact information help make the draft more useful.',
  },
  {
    q: 'What does the AI generate?',
    a: 'NexMenus organizes dishes into menu categories and can draft item descriptions, business copy, frequently asked questions, and a visual theme. You remain responsible for reviewing every detail before publishing.',
  },
  {
    q: 'Can I edit the generated menu?',
    a: 'Yes. Continue chatting to change names, prices, descriptions, categories, or business details. Claiming the draft into a free account gives you access to the full menu editor.',
  },
  {
    q: 'Does it create a QR code and printable menu?',
    a: 'Yes. A claimed NexMenus menu can be shared as a mobile-friendly link or QR code and used to produce a matching printable menu.',
  },
  {
    q: 'Can AI safely write allergen or dietary information?',
    a: 'AI can help draft wording, but restaurant owners must verify ingredients, allergen information, dietary claims, prices, and availability before publishing.',
  },
];

@Component({
  selector: 'app-ai-menu-generator-page',
  imports: [
    RouterLink,
    BrandLogoComponent,
    MenuBuilderComponent,
    PublicMenuPageComponent,
  ],
  templateUrl: './ai-menu-generator-page.html',
  styleUrl: './ai-menu-generator-page.css',
})
export class AiMenuGeneratorPageComponent implements OnDestroy {
  readonly year = new Date().getFullYear();
  readonly activeTab = signal<MobileTab>('builder');
  readonly builderStep = signal<BuilderStep>('business');
  readonly previewState = signal<PreviewState>('example');
  readonly previewMenu = signal<PublicMenu | null>(null);
  readonly previewRefreshing = signal(false);
  readonly exampleMenu = EXAMPLE_MENU;

  private previewToken: string | null = null;
  private previewRequest?: Subscription;

  constructor(
    private readonly drafts: DraftService,
    private readonly seo: SeoService,
  ) {
    this.seo.setPage({
      title: 'Free AI Menu Generator for Restaurants | NexMenus',
      description:
        'Create a restaurant menu with AI. Enter your business and dishes, review AI-written categories and descriptions in a live menu preview, then share by link, QR code, or print.',
      ogDescription:
        'Turn a dish list into an editable restaurant menu with AI and watch the real menu take shape in a live preview. Free to start—no credit card.',
      twitterDescription:
        'Create an editable restaurant menu with AI and review it in a live storefront preview. Free to start.',
      canonicalPath: '/ai-menu-generator',
    });

    this.seo.addJsonLd('nx-ai-menu-generator-jsonld', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${PAGE}/#webpage`,
          url: PAGE,
          name: 'Free AI Menu Generator for Restaurants | NexMenus',
          description:
            'An interactive AI menu generator that turns restaurant details and a dish list into an editable digital menu draft with a live preview.',
          isPartOf: { '@id': `${SITE}/#website` },
          about: { '@id': `${PAGE}/#software` },
        },
        {
          '@type': 'SoftwareApplication',
          '@id': `${PAGE}/#software`,
          name: 'NexMenus AI Menu Generator',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          url: PAGE,
          description:
            'Create an organized restaurant menu with AI-written descriptions, business copy, a live digital preview, QR sharing, and printable output.',
          publisher: { '@id': `${SITE}/#organization` },
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          featureList: [
            'AI-assisted menu organization',
            'AI-written menu descriptions',
            'Live restaurant menu preview',
            'Editable menu draft',
            'QR code menu',
            'Printable restaurant menu',
          ],
        },
        {
          '@type': 'FAQPage',
          '@id': `${PAGE}/#faq`,
          mainEntity: FAQS.map(({ q, a }) => ({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          })),
        },
      ],
    });
  }

  onPreviewUrl(url: string | null): void {
    this.previewRequest?.unsubscribe();
    this.previewRequest = undefined;
    this.previewToken = url ? this.extractPreviewToken(url) : null;

    if (!this.previewToken) {
      this.previewMenu.set(null);
      this.previewState.set(url ? 'error' : 'example');
      this.previewRefreshing.set(false);
      return;
    }

    this.loadPreview();
  }

  onDraftVersion(): void {
    if (this.previewToken) this.loadPreview();
  }

  onStep(step: BuilderStep): void {
    this.builderStep.set(step);
  }

  stageState(stage: BuilderStep): 'done' | 'active' | 'pending' {
    const order: BuilderStep[] = ['business', 'items', 'preview'];
    const current = order.indexOf(this.builderStep());
    const target = order.indexOf(stage);
    return target < current ? 'done' : target === current ? 'active' : 'pending';
  }

  ngOnDestroy(): void {
    this.previewRequest?.unsubscribe();
  }

  private loadPreview(): void {
    if (!this.previewToken) return;
    const hasMenu = Boolean(this.previewMenu());
    this.previewRefreshing.set(hasMenu);
    if (!hasMenu) this.previewState.set('loading');

    this.previewRequest?.unsubscribe();
    this.previewRequest = this.drafts.getPreview(this.previewToken).subscribe({
      next: preview => {
        this.previewMenu.set(withDraftPlaceholders(preview.menu));
        this.previewState.set('ready');
        this.previewRefreshing.set(false);
      },
      error: () => {
        if (!this.previewMenu()) this.previewState.set('error');
        this.previewRefreshing.set(false);
      },
    });
  }

  private extractPreviewToken(url: string): string | null {
    const match = url.match(/\/preview\/([^/?#]+)/);
    if (!match?.[1]) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }
}