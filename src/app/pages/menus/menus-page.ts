import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { Market, MenuSummary, SUPPORTED_MARKETS, menuInitials, relativeTime } from '../../models/menu.model';
import { BottomSheetComponent } from '../../components/ui/bottom-sheet/bottom-sheet';

@Component({
  selector: 'app-menus-page',
  imports: [FormsModule, RouterLink, BottomSheetComponent],
  templateUrl: './menus-page.html',
  styleUrl: './menus-page.css',
})
export class MenusPageComponent {
  private menuService = inject(MenuService);
  private router = inject(Router);

  readonly menus = signal<MenuSummary[]>([]);
  readonly loading = signal(true);

  /** Cover-strip image URLs per menu id, fetched lazily from the preview-images endpoint. */
  private readonly previews = signal<Record<string, string[]>>({});

  createOpen = signal(false);
  newMenuName = signal('');
  newMenuMarket = signal<Market>('US');
  readonly markets = SUPPORTED_MARKETS;
  /** Free-text filter over the market list; matches country, code or currency. */
  marketQuery = signal('');
  creating = signal(false);
  toast = signal('');

  /**
   * Markets matching the query. Accent-insensitive so "espana" finds "España"
   * and "mexico" finds "México" — the labels are written in each market's own
   * language, which a plain substring match would hide from an ASCII keyboard.
   */
  readonly filteredMarkets = computed(() => {
    const query = fold(this.marketQuery());
    if (!query) return this.markets;
    return this.markets.filter(market =>
      fold(market.label).includes(query)
      || fold(market.code).includes(query)
      || fold(market.currency).includes(query),
    );
  });

  initials = menuInitials;
  updatedLabel = relativeTime;

  /** Tonal fallbacks for cover slots without a photo (mirrors the design strip). */
  private readonly coverFallbacks = [
    'linear-gradient(135deg,#dceaf2,#c2dbe9)',
    'linear-gradient(135deg,#f0e4d2,#e0c8a8)',
    'linear-gradient(135deg,#f0dce6,#e0c2d2)',
  ];

  /** Three `background` shorthand values for the cover strip; photos fill in newest-first. */
  coverSlots(menu: MenuSummary): string[] {
    const urls = this.previews()[menu.id] ?? [];
    return this.coverFallbacks.map((fallback, i) =>
      urls[i] ? `center/cover url('${urls[i]}')` : fallback,
    );
  }

  constructor() {
    this.reload();
  }

  private reload() {
    this.loading.set(true);
    this.previews.set({});
    this.menuService.listMenus().subscribe(menus => {
      this.menus.set(menus);
      this.loading.set(false);
      menus.forEach(menu => this.loadPreview(menu.id));
    });
  }

  /** Fills the cover strip once images arrive; gradients show until then. */
  private loadPreview(menuId: string) {
    this.menuService.getPreviewImages(menuId).subscribe({
      next: urls => this.previews.update(map => ({ ...map, [menuId]: urls })),
      error: () => {},
    });
  }

  publicUrl(menu: MenuSummary): string {
    return `nexmenus.com/m/${menu.slug}`;
  }

  copyLink(menu: MenuSummary) {
    navigator.clipboard?.writeText(`https://${this.publicUrl(menu)}`).catch(() => {});
    this.flash('Link copied');
  }

  openCreate() {
    this.newMenuName.set('');
    this.newMenuMarket.set('US');
    this.marketQuery.set('');
    this.createOpen.set(true);
  }

  /** Enter in the market search picks the only/first match instead of submitting. */
  pickFirstMarket() {
    const first = this.filteredMarkets()[0];
    if (first) this.newMenuMarket.set(first.code);
  }

  confirmCreate() {
    const name = this.newMenuName().trim();
    if (!name || this.creating()) return;
    this.creating.set(true);
    this.menuService.createMenu({ name, market: this.newMenuMarket() }).subscribe({
      next: menu => {
        this.creating.set(false);
        this.createOpen.set(false);
        this.router.navigate(['/editor', menu.id]);
      },
      error: () => {
        this.creating.set(false);
        this.flash('Could not create menu');
      },
    });
  }

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private flash(msg: string) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set(msg);
    this.toastTimer = setTimeout(() => this.toast.set(''), 1900);
  }
}

/** Lowercase and strip accents so "espana" matches "España". */
function fold(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
