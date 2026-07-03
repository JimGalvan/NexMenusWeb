/**
 * Menu domain types — mirror `docs/menus-api-contract.md` exactly so the
 * `MenuService` HTTP client and the pages share one source of truth. The owner
 * is derived from the bearer token, so no `ownerId` here.
 */

export type Market = 'US' | 'MX';
export type Currency = 'USD' | 'MXN';

export interface Category {
  id: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  /** Decimal amount as a string, e.g. "3.50". */
  priceAmount: string;
  visible: boolean;
  soldOut: boolean;
  position: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Menu {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  market: Market;
  currency: Currency;
  phone: string | null;
  address: string | null;
  operatingHours: string | null;
  /** When true, the owner's account email is exposed on the public menu. */
  showEmail: boolean;
  logoUrl: string | null;
  categories: Category[];
  items: MenuItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MenuSummary {
  id: string;
  name: string;
  slug: string;
  market: Market;
  currency: Currency;
  logoUrl: string | null;
  updatedAt: string;
}

/** Card cover strip payload from `GET /menus/{id}/preview-images`. */
export interface MenuPreviewImages {
  /** Up to 3 item image read URLs, newest first; empty when none qualify. */
  previewImageUrls: string[];
}

export interface PublicCategory {
  id: string;
  name: string;
  position: number;
}

export interface PublicMenuItem {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  priceAmount: string;
  soldOut: boolean;
  position: number;
  imageUrl: string | null;
}

export interface PublicMenu {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  market: Market;
  currency: Currency;
  phone: string | null;
  address: string | null;
  operatingHours: string | null;
  /** Owner's account email; present only when the owner opted to show it. */
  email: string | null;
  logoUrl: string | null;
  categories: PublicCategory[];
  items: PublicMenuItem[];
  uncategorizedItems: PublicMenuItem[];
}

// ---- request payloads ----

export interface CreateMenuRequest {
  name: string;
  market: Market;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  operatingHours?: string | null;
  showEmail?: boolean;
}

export interface UpdateMenuRequest {
  name: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  operatingHours?: string | null;
  showEmail?: boolean;
}

export interface AddCategoryRequest {
  name: string;
}

export interface RenameCategoryRequest {
  name: string;
}

export interface ReorderCategoriesRequest {
  categoryIds: string[];
}

export interface AddItemRequest {
  categoryId?: string | null;
  name: string;
  priceAmount: number | string;
  description?: string | null;
  visible?: boolean;
  soldOut?: boolean;
}

export interface UpdateItemRequest {
  categoryId: string | null;
  name: string;
  description: string | null;
  priceAmount: number | string;
  visible: boolean;
  soldOut: boolean;
}

export interface ReorderItemsRequest {
  /** Omit or null for the uncategorized group. */
  categoryId?: string | null;
  itemIds: string[];
}

/** Error envelope returned by every endpoint (see contract "Errors"). */
export interface ApiError {
  code: string;
  message: string;
}

// ---- helpers ----

export function currencyFor(market: Market): Currency {
  return market === 'MX' ? 'MXN' : 'USD';
}

/** Total item count across a full menu (owner view includes hidden items). */
export function menuItemCount(menu: Menu): number {
  return menu.items.length;
}

/** Two-letter monogram used as the logo fallback. */
export function menuInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0] ?? '')
      .join('')
      .toUpperCase() || 'NM'
  );
}

export function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'menu'
  );
}

/** Normalize any price input to the contract's "0.00" decimal string. */
export function formatPrice(amount: string | number): string {
  const n = typeof amount === 'number' ? amount : parseFloat(amount);
  return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : '0.00';
}

/** Diner-facing price label: "26.00" → "$26", "12.50" → "$12.50". */
export function priceLabel(amount: string): string {
  return '$' + amount.replace(/\.00$/, '');
}

/** Compact "2h ago" label derived from an ISO `updatedAt`. */
export function relativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
