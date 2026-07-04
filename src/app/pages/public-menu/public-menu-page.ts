import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { PublicMenu, PublicMenuItem, menuInitials } from '../../models/menu.model';
import { BottomSheetComponent } from '../../components/ui/bottom-sheet/bottom-sheet';

const CAT_GRADIENTS: Record<string, string> = {
  Starters: 'linear-gradient(135deg,#e2ecd9,#c7d9ba)',
  'From the Sea': 'linear-gradient(135deg,#d6e7f0,#b6d2e2)',
  Mains: 'linear-gradient(135deg,#eedfcc,#dbc1a5)',
  Pasta: 'linear-gradient(135deg,#f1e5ca,#e4cfa2)',
  Desserts: 'linear-gradient(135deg,#eedce5,#ddc2d0)',
  Drinks: 'linear-gradient(135deg,#dfe3ee,#c2c9dd)',
  Plates: 'linear-gradient(135deg,#eedfcc,#dbc1a5)',
};

/** Sentinel category id for the uncategorized group's pill. */
const UNCATEGORIZED = '__uncategorized__';

interface Pill {
  id: string;
  name: string;
}

/** Diner-facing public menu (photo-forward direction A). Themeable per restaurant. */
@Component({
  selector: 'app-public-menu-page',
  imports: [RouterLink, BottomSheetComponent],
  templateUrl: './public-menu-page.html',
  styleUrl: './public-menu-page.css',
})
export class PublicMenuPageComponent {
  private route = inject(ActivatedRoute);
  private menuService = inject(MenuService);
  private authService = inject(AuthService);
  private seo = inject(SeoService);

  readonly accent = this.menuService.accent;

  private slug = this.route.snapshot.paramMap.get('slug')!;
  readonly landingPreview = this.route.snapshot.queryParamMap.get('embed') === 'landing';
  readonly menu = signal<PublicMenu | null>(null);
  readonly loading = signal(true);
  readonly ownerMenuId = signal<string | null>(null);

  activeCatId = signal<string>('');
  infoOpen = signal(false);
  selectedPhoto = signal<PublicMenuItem | null>(null);

  readonly initials = computed(() => (this.menu() ? menuInitials(this.menu()!.name) : ''));

  constructor() {
    this.menuService.getPublicMenu(this.slug).subscribe({
      next: menu => {
        this.menu.set(menu);
        this.seo.setPage({
          title: `${menu.name} Menu | NexMenus`,
          description: menu.description
            ? `${menu.description} View the live ${menu.name} menu online.`
            : `View the live ${menu.name} menu online, including categories, item details, and current prices.`,
          canonicalPath: `/m/${this.slug}`,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.resolveOwnerMenu();
  }

  private resolveOwnerMenu() {
    if (!this.authService.isAuthenticated()) return;
    this.menuService.listMenus().subscribe({
      next: menus => this.ownerMenuId.set(menus.find(menu => menu.slug === this.slug)?.id ?? null),
      error: () => this.ownerMenuId.set(null),
    });
  }

  /** Category pills with at least one visible item, plus a trailing group for
   *  uncategorized items when present. */
  readonly pills = computed<Pill[]>(() => {
    const menu = this.menu();
    if (!menu) return [];
    const pills: Pill[] = menu.categories
      .filter(c => menu.items.some(i => i.categoryId === c.id))
      .map(c => ({ id: c.id, name: c.name }));
    if (menu.uncategorizedItems.length) pills.push({ id: UNCATEGORIZED, name: 'More' });
    return pills;
  });

  readonly currentCatId = computed(() => {
    const pills = this.pills();
    const active = this.activeCatId();
    return pills.some(p => p.id === active) ? active : pills[0]?.id ?? '';
  });

  readonly currentCatName = computed(
    () => this.pills().find(p => p.id === this.currentCatId())?.name ?? '',
  );

  readonly items = computed<PublicMenuItem[]>(() => {
    const menu = this.menu();
    if (!menu) return [];
    const id = this.currentCatId();
    if (id === UNCATEGORIZED) return menu.uncategorizedItems;
    return menu.items.filter(i => i.categoryId === id);
  });

  gradientFor(cat: string): string {
    return CAT_GRADIENTS[cat] ?? '#e7e7ec';
  }

  photo(item: PublicMenuItem): string {
    return item.imageUrl
      ? `url("${item.imageUrl}") center/cover no-repeat, ${this.gradientFor(this.currentCatName())}`
      : this.gradientFor(this.currentCatName());
  }

  openPhoto(item: PublicMenuItem) {
    if (item.imageUrl) this.selectedPhoto.set(item);
  }

  closePhoto() {
    this.selectedPhoto.set(null);
  }
}
