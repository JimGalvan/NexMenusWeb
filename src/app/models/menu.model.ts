/**
 * Menu domain types — mirror `docs/menus-api-contract.md` exactly so the
 * `MenuService` HTTP client and the pages share one source of truth. The owner
 * is derived from the bearer token, so no `ownerId` here.
 */

// Country/currency come from the API (config-driven allowlist there); these are
// open string types so adding a country never requires a frontend type change.
export type Market = string;
export type Currency = string;

/** One entry from GET /api/v1/metadata/markets. */
export interface MarketOption {
  code: Market;
  label: string;
  currency: Currency;
}

// ---- v2 properties ----

export type MenuPropertyType = 'TEXT' | 'URL' | 'MEDIA' | 'BOOLEAN' | 'NUMBER' | 'JSON';

/**
 * Generic name/type/value menu data (v2). Well-known ("virtual") names map to
 * the flat v1 fields on the backend: `phone`, `address`, `operatingHours`,
 * `showEmail`, `logoObjectKey` (MEDIA, read-only — its value arrives as a
 * presigned URL). Any other name is a custom property that needs no new
 * endpoint or backend change.
 */
export interface MenuProperty {
  name: string;
  type: MenuPropertyType;
  /** null in a write request clears/removes the property. */
  value: string | null;
}

/** Virtual property names handled specially by the client adapters. */
export const MENU_PROPERTY_KEYS = {
  phone: 'phone',
  address: 'address',
  operatingHours: 'operatingHours',
  showEmail: 'showEmail',
  logo: 'logoObjectKey',
  cover: 'coverObjectKey',
} as const;

export type MenuMediaKind = 'logo' | 'cover';

export const MENU_CUISINES_PROPERTY = 'cuisines';
export const MENU_HIGHLIGHTS_PROPERTY = 'highlights';
export const MENU_FAQS_PROPERTY = 'faqs';
export const MENU_ABOUT_PROPERTY = 'about';
export const MENU_ACCENT_PROPERTY = 'accentColor';

export interface MenuFaq {
  question: string;
  answer: string;
}

function propertyJson(properties: MenuProperty[] | undefined, name: string): unknown {
  const raw = properties?.find(property => property.name === name)?.value;
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function coverUrlFrom(properties: MenuProperty[] | undefined): string | null {
  return properties?.find(property => property.name === MENU_PROPERTY_KEYS.cover)?.value ?? null;
}

export function cuisinesFrom(properties: MenuProperty[] | undefined): string[] {
  const value = propertyJson(properties, MENU_CUISINES_PROPERTY);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function highlightsFrom(properties: MenuProperty[] | undefined): string[] {
  const value = propertyJson(properties, MENU_HIGHLIGHTS_PROPERTY);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function faqsFrom(properties: MenuProperty[] | undefined): MenuFaq[] {
  const value = propertyJson(properties, MENU_FAQS_PROPERTY);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MenuFaq =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as MenuFaq).question === 'string' &&
      typeof (item as MenuFaq).answer === 'string',
  );
}

export function aboutFrom(properties: MenuProperty[] | undefined): string {
  return properties?.find(property => property.name === MENU_ABOUT_PROPERTY)?.value?.trim() ?? '';
}

export function accentFrom(properties: MenuProperty[] | undefined): string | null {
  const value = properties?.find(property => property.name === MENU_ACCENT_PROPERTY)?.value?.trim() ?? '';
  return /^#[0-9a-f]{6}$/i.test(value) ? value : null;
}

/** Custom property holding how diners contact the phone number. */
export const MENU_CONTACT_METHOD_PROPERTY = 'phoneContactMethod';

export type ContactMethod = 'text' | 'call';

/** Contact method for the menu phone; absent or unrecognized means 'text'. */
export function contactMethodFrom(properties: MenuProperty[] | undefined): ContactMethod {
  return properties?.find(p => p.name === MENU_CONTACT_METHOD_PROPERTY)?.value === 'call'
    ? 'call'
    : 'text';
}

/** Custom property shared with the social-links implementation in Teasely. */
export const MENU_SOCIAL_LINKS_PROPERTY = 'socialLinks';

export interface SocialLink {
  key: string;
  handle: string;
  visible: boolean;
}

/** Parse valid social links without letting malformed custom JSON break a menu. */
export function socialsFrom(properties: MenuProperty[] | undefined): SocialLink[] {
  const raw = properties?.find(p => p.name === MENU_SOCIAL_LINKS_PROPERTY)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (link): link is { key: string; handle: string; visible?: boolean } =>
              !!link && typeof link.key === 'string' && typeof link.handle === 'string',
          )
          .map(link => ({ key: link.key, handle: link.handle, visible: link.visible !== false }))
      : [];
  } catch {
    return [];
  }
}

export function instagramHandleFrom(properties: MenuProperty[] | undefined): string {
  return socialsFrom(properties).find(link => link.key === 'instagram' && link.visible)?.handle ?? '';
}

export function instagramUrlFrom(properties: MenuProperty[] | undefined): string | null {
  const handle = instagramHandleFrom(properties);
  return handle ? `https://www.instagram.com/${encodeURIComponent(handle)}/` : null;
}

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
  /** Custom (non-virtual) v2 properties; empty for v1-only responses. */
  properties: MenuProperty[];
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
  /**
   * Whether to render the "powered by NexMenus" footer. Free menus carry it,
   * Pro pays to remove it. Comes from the API rather than the client because
   * this page is server-rendered for diners who are never signed in.
   */
  showBranding: boolean;
  logoUrl: string | null;
  /** Custom (non-virtual) v2 properties; empty for v1-only responses. */
  properties: MenuProperty[];
  categories: PublicCategory[];
  items: PublicMenuItem[];
  uncategorizedItems: PublicMenuItem[];
}

/** Replace (or add) one property by name, so placeholder values win over null-valued entries. */
function upsertProperty(
  properties: MenuProperty[],
  name: string,
  type: MenuPropertyType,
  value: string,
): MenuProperty[] {
  return [...properties.filter(property => property.name !== name), { name, type, value }];
}

/**
 * Draft-preview empty state: fill empty cosmetic text fields with placeholder
 * copy so the storefront shell renders fully while a draft is still sparse.
 * Only display-only fields are filled — never address/phone/email, which would
 * turn into working Directions/tel links to fake data. Preview surfaces apply
 * this at the data boundary; the live /m/:slug page never uses it.
 */
export function withDraftPlaceholders(menu: PublicMenu): PublicMenu {
  let properties = menu.properties;
  if (!cuisinesFrom(properties).length) {
    properties = upsertProperty(properties, MENU_CUISINES_PROPERTY, 'JSON', JSON.stringify(['no cuisine yet']));
  }
  if (!highlightsFrom(properties).length) {
    properties = upsertProperty(properties, MENU_HIGHLIGHTS_PROPERTY, 'JSON', JSON.stringify(['no highlights yet']));
  }
  if (!aboutFrom(properties)) {
    const location = menu.address ? '' : ' Location: not added yet.';
    properties = upsertProperty(properties, MENU_ABOUT_PROPERTY, 'TEXT', `No about section yet.${location}`);
  }
  return {
    ...menu,
    description: menu.description?.trim() ? menu.description : 'No menu description yet',
    properties,
  };
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
  /** Custom properties to upsert (or remove, when value is null). */
  properties?: MenuProperty[];
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

/** Price display is formatted by the menu's market, not the viewer's locale (Q7). */
const CURRENCY_LOCALE: Record<string, string> = {
  USD: 'en-US',
  MXN: 'es-MX',
  CAD: 'en-CA',
  GBP: 'en-GB',
  EUR: 'es-ES',
  AUD: 'en-AU',
  NZD: 'en-NZ',
  SGD: 'en-SG',
  HKD: 'en-HK',
  AED: 'en-AE',
  ZAR: 'en-ZA',
  BRL: 'pt-BR',
  INR: 'en-IN',
  PHP: 'en-PH',
  MYR: 'en-MY',
  THB: 'th-TH',
  IDR: 'id-ID',
};

/**
 * Currencies whose ISO minor unit (2) no longer matches how prices are quoted —
 * sub-units are defunct, so menus use whole amounts. Mirrors the API's
 * PRACTICAL_ZERO_DECIMAL set in MenuOperations. Everything else lets Intl apply
 * the currency's own ISO default (USD → 2, JPY → 0).
 */
const PRACTICAL_ZERO_DECIMAL = new Set(['IDR', 'HUF']);

/** "14" + "USD" → "$14.00"; "12.5" + "EUR" → "12,50 €"; "15000" + "IDR" → "Rp 15.000". */
export function moneyLabel(amount: string | number, currency: Currency = 'USD'): string {
  const n = typeof amount === 'number' ? amount : parseFloat(amount);
  const safe = Number.isFinite(n) && n >= 0 ? n : 0;
  const digits = PRACTICAL_ZERO_DECIMAL.has(currency) ? 0 : undefined;
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? 'en-US', {
      style: 'currency',
      currency,
      ...(digits !== undefined ? { minimumFractionDigits: digits, maximumFractionDigits: digits } : {}),
    }).format(safe);
  } catch {
    return safe.toFixed(digits ?? 2) + ' ' + currency;
  }
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
      .filter(w => /[\p{L}\p{N}]/u.test(w[0] ?? ''))
      .slice(0, 2)
      .map(w => w[0])
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

/** Preserve up to three decimals while keeping the editor's usual two-digit shape. */
export function formatPrice(amount: string | number): string {
  const n = typeof amount === 'number' ? amount : parseFloat(amount);
  if (!Number.isFinite(n) || n < 0) return '0.00';
  return n.toFixed(3).replace(/0$/, '');
}

/** Diner-facing compact price label: whole amounts drop cents ("$26", "$12.50"). */
export function priceLabel(amount: string, currency: Currency = 'USD'): string {
  return moneyLabel(amount, currency).replace(/([.,]00)(?=\D|$)/, '');
}

/** Whether a diner-facing item has a price worth displaying. */
export function hasPrice(amount: string): boolean {
  return Number(amount) > 0;
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
