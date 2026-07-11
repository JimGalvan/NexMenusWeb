import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { safeStorage } from '../core/safe-storage';
import {
  AddCategoryRequest,
  AddItemRequest,
  Category,
  CreateMenuRequest,
  MenuMediaKind,
  MENU_PROPERTY_KEYS,
  Menu,
  MenuItem,
  MenuPreviewImages,
  MenuProperty,
  MenuSummary,
  PublicMenu,
  PublicMenuItem,
  RenameCategoryRequest,
  ReorderCategoriesRequest,
  ReorderItemsRequest,
  UpdateItemRequest,
  UpdateMenuRequest,
  formatPrice,
} from '../models/menu.model';

const ACCENT_KEY = 'nx_accent';

/**
 * Menus API client (docs/menus-api-contract.md). The owner is derived from the
 * bearer token by the backend, so no owner id is ever sent; `authInterceptor`
 * attaches the token and handles 401→refresh.
 *
 * Wire quirks handled here so the rest of the app sees the contract's TS types:
 * `priceAmount` travels as a JSON number (`BigDecimal`) and is normalized to a
 * "0.00" string on the way in / a number on the way out.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiBaseUrl}/api/${environment.apiVersion}/menus`;
  private readonly publicApi = `${environment.apiBaseUrl}/api/${environment.apiVersion}/public/menus`;
  /** v2 carries contact/logo (and any future menu data) as a generic property list. */
  private readonly apiV2 = `${environment.apiBaseUrl}/api/${environment.apiVersionV2}/menus`;
  private readonly publicApiV2 = `${environment.apiBaseUrl}/api/${environment.apiVersionV2}/public/menus`;

  /** Last-used brand accent fallback; saved menus persist their own accent as a v2 property. */
  readonly accent = signal<string>(safeStorage.getItem(ACCENT_KEY) ?? '#22224b');

  setAccent(color: string): void {
    this.accent.set(color);
    safeStorage.setItem(ACCENT_KEY, color);
  }

  // ---- menus ----

  listMenus(): Observable<MenuSummary[]> {
    return this.http.get<MenuSummary[]>(this.api);
  }

  getMenu(menuId: string): Observable<Menu> {
    return this.http.get<MenuV2Wire>(`${this.apiV2}/${menuId}`).pipe(map(toMenuFromV2));
  }

  /** Up to 3 item image URLs for a menu's card cover strip (separate, never-cached endpoint). */
  getPreviewImages(menuId: string): Observable<string[]> {
    return this.http
      .get<MenuPreviewImages>(`${this.api}/${menuId}/preview-images`)
      .pipe(map(res => res.previewImageUrls));
  }

  createMenu(req: CreateMenuRequest): Observable<Menu> {
    return this.http
      .post<MenuWire>(this.api, {
        name: req.name,
        description: req.description ?? null,
        market: req.market,
        phone: req.phone ?? null,
        address: req.address ?? null,
        operatingHours: req.operatingHours ?? null,
        showEmail: req.showEmail ?? false,
      })
      .pipe(map(toMenu));
  }

  updateMenu(menuId: string, req: UpdateMenuRequest): Observable<Menu> {
    return this.http
      .patch<MenuV2Wire>(`${this.apiV2}/${menuId}`, {
        name: req.name,
        description: req.description ?? null,
        properties: [
          { name: MENU_PROPERTY_KEYS.phone, type: 'TEXT', value: req.phone ?? null },
          { name: MENU_PROPERTY_KEYS.address, type: 'TEXT', value: req.address ?? null },
          { name: MENU_PROPERTY_KEYS.operatingHours, type: 'TEXT', value: req.operatingHours ?? null },
          { name: MENU_PROPERTY_KEYS.showEmail, type: 'BOOLEAN', value: String(req.showEmail ?? false) },
          ...(req.properties ?? []),
        ],
      })
      .pipe(map(toMenuFromV2));
  }

  deleteMenu(menuId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${menuId}`);
  }

  // ---- categories ----

  addCategory(menuId: string, req: AddCategoryRequest): Observable<Category> {
    return this.http.post<Category>(`${this.api}/${menuId}/categories`, { name: req.name });
  }

  renameCategory(menuId: string, categoryId: string, req: RenameCategoryRequest): Observable<Category> {
    return this.http.patch<Category>(`${this.api}/${menuId}/categories/${categoryId}`, { name: req.name });
  }

  reorderCategories(menuId: string, req: ReorderCategoriesRequest): Observable<Category[]> {
    return this.http.put<Category[]>(`${this.api}/${menuId}/categories/order`, { categoryIds: req.categoryIds });
  }

  deleteCategory(menuId: string, categoryId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${menuId}/categories/${categoryId}`);
  }

  // ---- items ----

  addItem(menuId: string, req: AddItemRequest): Observable<MenuItem> {
    return this.http.post<MenuItemWire>(`${this.api}/${menuId}/items`, itemBody(req)).pipe(map(toItem));
  }

  updateItem(menuId: string, itemId: string, req: UpdateItemRequest): Observable<MenuItem> {
    return this.http.patch<MenuItemWire>(`${this.api}/${menuId}/items/${itemId}`, itemBody(req)).pipe(map(toItem));
  }

  reorderItems(menuId: string, req: ReorderItemsRequest): Observable<MenuItem[]> {
    return this.http
      .put<MenuItemWire[]>(`${this.api}/${menuId}/items/order`, {
        categoryId: req.categoryId ?? null,
        itemIds: req.itemIds,
      })
      .pipe(map(items => items.map(toItem)));
  }

  deleteItem(menuId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${menuId}/items/${itemId}`);
  }

  // ---- media ----

  uploadMedia(menuId: string, kind: MenuMediaKind, file: File): Observable<Menu> {
    return this.http.post<MenuV2Wire>(`${this.api}/${menuId}/media/${kind}`, formData(file)).pipe(map(toMenuFromV2));
  }

  uploadLogo(menuId: string, file: File): Observable<Menu> {
    return this.http.post<MenuWire>(`${this.api}/${menuId}/logo`, formData(file)).pipe(map(toMenu));
  }

  uploadItemImage(menuId: string, itemId: string, file: File): Observable<MenuItem> {
    return this.http
      .post<MenuItemWire>(`${this.api}/${menuId}/items/${itemId}/image`, formData(file))
      .pipe(map(toItem));
  }

  // ---- public ----

  getPublicMenu(slug: string): Observable<PublicMenu> {
    return this.http.get<PublicMenuV2Wire>(`${this.publicApiV2}/${slug}`).pipe(map(toPublicMenuFromV2));
  }
}

// ---- wire types (priceAmount arrives as a JSON number) ----

type MenuItemWire = Omit<MenuItem, 'priceAmount'> & { priceAmount: number | string };
type MenuWire = Omit<Menu, 'items' | 'properties'> & { items: MenuItemWire[] };
type PublicMenuItemWire = Omit<PublicMenuItem, 'priceAmount'> & { priceAmount: number | string };

/** v2 wire shapes: flat contact/logo fields are replaced by `properties`. */
type MenuV2Wire = Omit<
  Menu,
  'items' | 'phone' | 'address' | 'operatingHours' | 'showEmail' | 'logoUrl'
> & { items: MenuItemWire[] };
type PublicMenuV2Wire = Omit<
  PublicMenu,
  'items' | 'uncategorizedItems' | 'phone' | 'address' | 'operatingHours' | 'logoUrl'
> & {
  items: PublicMenuItemWire[];
  uncategorizedItems: PublicMenuItemWire[];
};

function toItem(raw: MenuItemWire): MenuItem {
  return { ...raw, priceAmount: formatPrice(raw.priceAmount) };
}

/** v1 responses (create, logo upload) carry flat fields and no custom properties. */
function toMenu(raw: MenuWire): Menu {
  return { ...raw, properties: [], items: raw.items.map(toItem) };
}

/**
 * Splits a v2 property list into the flat convenience fields the pages consume
 * and the remaining custom properties. `logoObjectKey` is MEDIA, so its value
 * arrives as a presigned read URL.
 */
function splitProperties(properties: MenuProperty[]) {
  const virtual = new Map(
    properties
      .filter(p => (Object.values(MENU_PROPERTY_KEYS) as string[]).includes(p.name))
      .map(p => [p.name, p.value])
  );
  return {
    phone: virtual.get(MENU_PROPERTY_KEYS.phone) ?? null,
    address: virtual.get(MENU_PROPERTY_KEYS.address) ?? null,
    operatingHours: virtual.get(MENU_PROPERTY_KEYS.operatingHours) ?? null,
    showEmail: virtual.get(MENU_PROPERTY_KEYS.showEmail) === 'true',
    logoUrl: virtual.get(MENU_PROPERTY_KEYS.logo) ?? null,
    custom: properties.filter(p => p.name === MENU_PROPERTY_KEYS.cover || !(Object.values(MENU_PROPERTY_KEYS) as string[]).includes(p.name)),
  };
}

function toMenuFromV2(raw: MenuV2Wire): Menu {
  const { custom, ...flat } = splitProperties(raw.properties);
  return { ...raw, ...flat, properties: custom, items: raw.items.map(toItem) };
}

function toPublicMenuFromV2(raw: PublicMenuV2Wire): PublicMenu {
  const normalize = (i: PublicMenuItemWire): PublicMenuItem => ({ ...i, priceAmount: formatPrice(i.priceAmount) });
  const { custom, showEmail: _showEmail, ...flat } = splitProperties(raw.properties);
  return {
    ...raw,
    ...flat,
    properties: custom,
    items: raw.items.map(normalize),
    uncategorizedItems: raw.uncategorizedItems.map(normalize),
  };
}

function itemBody(req: AddItemRequest | UpdateItemRequest) {
  const amount = Number(req.priceAmount);
  return {
    categoryId: req.categoryId ?? null,
    name: req.name,
    description: req.description ?? null,
    priceAmount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
    visible: req.visible,
    soldOut: req.soldOut,
  };
}

function formData(file: File): FormData {
  const fd = new FormData();
  fd.append('file', file);
  return fd;
}
