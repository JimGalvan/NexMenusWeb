import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

interface SeoMetadata {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  type?: string;
  /** Keep crawlers away from duplicate/embedded variants of a page. */
  noindex?: boolean;
}

const SITE_URL = 'https://nexmenus.com';
const DEFAULT_IMAGE = `${SITE_URL}/static/favicon/android-chrome-512x512.png`;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  setPage(metadata: SeoMetadata): void {
    const url = `${SITE_URL}${metadata.canonicalPath ?? this.document.location.pathname}`;
    const image = metadata.image ?? DEFAULT_IMAGE;

    this.title.setTitle(metadata.title);
    this.upsert('name', 'description', metadata.description);
    this.upsert('name', 'robots', metadata.noindex ? 'noindex, nofollow' : 'index,follow,max-image-preview:large');
    this.upsert('property', 'og:site_name', 'NexMenus');
    this.upsert('property', 'og:type', metadata.type ?? 'website');
    this.upsert('property', 'og:title', metadata.title);
    this.upsert('property', 'og:description', metadata.description);
    this.upsert('property', 'og:url', url);
    this.upsert('property', 'og:image', image);
    this.upsert('name', 'twitter:card', 'summary_large_image');
    this.upsert('name', 'twitter:title', metadata.title);
    this.upsert('name', 'twitter:description', metadata.description);
    this.upsert('name', 'twitter:image', image);
    this.setCanonical(url);
  }

  /** Replace the site favicon with a custom image (e.g. a menu's logo). */
  setFavicon(url: string): void {
    this.document.head
      .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')
      .forEach(link => link.remove());
    const icon = this.document.createElement('link');
    icon.rel = 'icon';
    icon.href = url;
    this.document.head.appendChild(icon);
    const apple = this.document.createElement('link');
    apple.rel = 'apple-touch-icon';
    apple.href = url;
    this.document.head.appendChild(apple);
  }

  addJsonLd(id: string, data: Record<string, unknown>): void {
    const existing = this.document.getElementById(id);
    if (existing) existing.remove();

    const script = this.document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    this.document.head.appendChild(script);
  }

  private upsert(attribute: 'name' | 'property', key: string, content: string): void {
    this.meta.updateTag({ [attribute]: key, content }, `${attribute}="${key}"`);
  }

  private setCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }
}