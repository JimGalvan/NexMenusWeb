import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DraftService } from '../../services/draft.service';
import { SeoService } from '../../services/seo.service';
import { DraftCategory, DraftPreview } from '../../models/draft.model';
import { formatPrice } from '../../models/menu.model';

type PreviewState = 'loading' | 'ready' | 'gone' | 'invalid' | 'unavailable';

/**
 * Read-only render of an unclaimed anonymous draft (tokenized link from
 * ChatGPT). Explicitly a draft: banner, expiry, noindex; no claim link here —
 * the claim URL is a separate credential that lives in the user's ChatGPT
 * conversation.
 */
@Component({
  selector: 'app-preview-page',
  imports: [RouterLink],
  templateUrl: './preview-page.html',
  styleUrl: './preview-page.css',
})
export class PreviewPageComponent {
  private route = inject(ActivatedRoute);
  private draftService = inject(DraftService);
  private seo = inject(SeoService);

  readonly state = signal<PreviewState>('loading');
  readonly preview = signal<DraftPreview | null>(null);

  readonly title = computed(() => {
    const value = this.preview();
    return value?.businessName || value?.menuName || 'Menu draft';
  });
  readonly expiresText = computed(() => {
    const iso = this.preview()?.expiresAt;
    if (!iso) return '';
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  });
  readonly categories = computed<DraftCategory[]>(() => {
    const categories = this.preview()?.content?.categories ?? [];
    return [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  });
  readonly phoneHref = computed(() => {
    const content = this.preview()?.content;
    const phone = content?.location?.phone;
    if (!phone) return null;
    return (content?.ordering?.phoneContactMethod === 'call' ? 'tel:' : 'sms:') + phone;
  });

  constructor() {
    this.seo.setPage({
      title: 'Menu draft preview | NexMenus',
      description: 'Private preview of an unclaimed menu draft.',
      noindex: true,
    });
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!token) {
      this.state.set('invalid');
      return;
    }
    this.draftService.getPreview(token).subscribe({
      next: preview => {
        this.preview.set(preview);
        this.state.set('ready');
      },
      error: (error: HttpErrorResponse) => {
        this.state.set(error.status === 410 ? 'gone' : error.status === 503 ? 'unavailable' : 'invalid');
      },
    });
  }

  price(amount: string | number): string {
    return formatPrice(amount);
  }
}
