import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DraftService } from '../../services/draft.service';
import { MenuBuilderSessionService } from '../../services/menu-builder-session.service';
import { SeoService } from '../../services/seo.service';
import { PublicMenu } from '../../models/menu.model';
import { PublicMenuPageComponent } from '../public-menu/public-menu-page';

type PreviewState = 'loading' | 'ready' | 'gone' | 'invalid' | 'unavailable';

/**
 * Read-only render of an unclaimed anonymous draft (tokenized link from
 * ChatGPT). Wraps the real storefront renderer with a draft banner, so the
 * preview is pixel-identical to what claiming produces. No claim link here —
 * the claim URL is a separate credential that lives in the user's ChatGPT
 * conversation.
 */
@Component({
  selector: 'app-preview-page',
  imports: [RouterLink, PublicMenuPageComponent],
  templateUrl: './preview-page.html',
  styleUrl: './preview-page.css',
})
export class PreviewPageComponent {
  private route = inject(ActivatedRoute);
  private draftService = inject(DraftService);
  private session = inject(MenuBuilderSessionService);
  private seo = inject(SeoService);

  readonly state = signal<PreviewState>('loading');
  readonly storefrontMenu = signal<PublicMenu | null>(null);
  /** Set only when this browser's own builder session owns this draft. */
  readonly ownerClaimUrl = signal<string | null>(null);
  private readonly expiresAt = signal<string | null>(null);

  readonly expiresText = computed(() => {
    const iso = this.expiresAt();
    if (!iso) return '';
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
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
    // Owner shortcut (session-recovery plan): only the browser that built the
    // draft holds its claim URL; visitors from a shared link see no claim CTA.
    const saved = this.session.load();
    if (saved?.claimUrl && saved.previewUrl?.includes(token)) {
      this.ownerClaimUrl.set(saved.claimUrl);
    }
    this.draftService.getPreview(token).subscribe({
      next: preview => {
        this.storefrontMenu.set(preview.menu);
        this.expiresAt.set(preview.expiresAt);
        this.state.set('ready');
      },
      error: (error: HttpErrorResponse) => {
        this.state.set(error.status === 410 ? 'gone' : error.status === 503 ? 'unavailable' : 'invalid');
      },
    });
  }
}
