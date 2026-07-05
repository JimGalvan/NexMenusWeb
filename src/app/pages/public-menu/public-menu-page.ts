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
        const city = extractCity(menu.address);
        this.seo.setPage({
          title: city ? `${menu.name} — Menu & Prices in ${city} | NexMenus` : `${menu.name} Menu | NexMenus`,
          description: buildDescription(menu, city),
          noindex: this.landingPreview,
          canonicalPath: `/m/${this.slug}`,
          image: menu.logoUrl ?? undefined,
        });
        this.seo.addJsonLd(`menu-jsonld-${menu.id}`, buildMenuJsonLd(menu, this.slug));
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

/**
 * Best-effort city extraction from the free-text address. Addresses are
 * typically "street, city[, region ...]", so the second comma segment is the
 * usual city slot; segments that are mostly digits (postal codes, street
 * numbers) are skipped. Returns null rather than guessing badly — callers
 * fall back to location-less copy.
 */
function extractCity(address: string | null): string | null {
  if (!address) return null;
  const segments = address
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (segments.length < 2) return null;
  const candidate = segments[1].replace(/\b\d{4,}\b/g, '').trim();
  const letters = candidate.replace(/[^\p{L}]/gu, '');
  if (!candidate || candidate.length > 40 || letters.length < candidate.length / 2) return null;
  return candidate;
}

/** Meta description: owner copy (or fallback) + location + a taste of the menu. */
function buildDescription(menu: PublicMenu, city: string | null): string {
  const where = city ? ` in ${city}` : '';
  const base = menu.description
    ? `${menu.description} View the live ${menu.name} menu${where} with current prices.`
    : `View the live ${menu.name} menu${where}, including categories, item details, and current prices.`;
  const dishes = [...menu.items, ...menu.uncategorizedItems]
    .slice(0, 3)
    .map(i => i.name)
    .join(', ');
  const withDishes = dishes ? `${base} Featuring ${dishes}.` : base;
  return withDishes.length <= 300 ? withDishes : base;
}

/**
 * schema.org Restaurant + Menu structured data. This is what Google reads to
 * show rich restaurant/menu results; prices are exposed as Offers with the
 * menu's currency. The address goes out as a structured PostalAddress when a
 * city can be extracted — that's what qualifies the page for local results
 * and helps Google tie it to the restaurant's Business Profile.
 */
function buildMenuJsonLd(menu: PublicMenu, slug: string): Record<string, unknown> {
  const city = extractCity(menu.address);
  const address = !menu.address
    ? null
    : city
      ? {
          '@type': 'PostalAddress',
          streetAddress: menu.address.split(',')[0].trim(),
          addressLocality: city,
          addressCountry: menu.market,
        }
      : menu.address;

  const prices = [...menu.items, ...menu.uncategorizedItems]
    .map(i => Number(i.priceAmount))
    .filter(p => Number.isFinite(p) && p > 0);
  const priceRange = prices.length
    ? `${Math.min(...prices)}-${Math.max(...prices)} ${menu.currency}`
    : null;

  const menuItem = (item: PublicMenuItem) => ({
    '@type': 'MenuItem',
    name: item.name,
    ...(item.description ? { description: item.description } : {}),
    ...(item.imageUrl ? { image: item.imageUrl } : {}),
    offers: {
      '@type': 'Offer',
      price: item.priceAmount,
      priceCurrency: menu.currency,
      availability: item.soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    },
  });

  const sections = menu.categories
    .map(category => ({
      '@type': 'MenuSection',
      name: category.name,
      hasMenuItem: menu.items.filter(i => i.categoryId === category.id).map(menuItem),
    }))
    .filter(section => section.hasMenuItem.length > 0);

  if (menu.uncategorizedItems.length) {
    sections.push({
      '@type': 'MenuSection',
      name: 'More',
      hasMenuItem: menu.uncategorizedItems.map(menuItem),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: menu.name,
    url: `https://nexmenus.com/m/${slug}`,
    ...(menu.description ? { description: menu.description } : {}),
    ...(menu.logoUrl ? { image: menu.logoUrl } : {}),
    ...(menu.phone ? { telephone: menu.phone } : {}),
    ...(address ? { address } : {}),
    ...(priceRange ? { priceRange } : {}),
    ...(menu.email ? { email: menu.email } : {}),
    hasMenu: {
      '@type': 'Menu',
      name: `${menu.name} Menu`,
      hasMenuSection: sections,
    },
  };
}
