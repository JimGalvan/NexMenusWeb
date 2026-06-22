import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AddCategoryRequest,
  AddItemRequest,
  Category,
  CreateMenuRequest,
  Menu,
  MenuItem,
  MenuPreviewImages,
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

  /** Brand accent is a client-only theming concern, not part of the contract. */
  readonly accent = signal<string>(localStorage.getItem(ACCENT_KEY) ?? '#22224b');

  setAccent(color: string): void {
    this.accent.set(color);
    localStorage.setItem(ACCENT_KEY, color);
  }

  // ---- menus ----

  listMenus(): Observable<MenuSummary[]> {
    return this.http.get<MenuSummary[]>(this.api);
  }

  getMenu(menuId: string): Observable<Menu> {
    return this.http.get<MenuWire>(`${this.api}/${menuId}`).pipe(map(toMenu));
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
      .patch<MenuWire>(`${this.api}/${menuId}`, {
        name: req.name,
        description: req.description ?? null,
        phone: req.phone ?? null,
        address: req.address ?? null,
        operatingHours: req.operatingHours ?? null,
        showEmail: req.showEmail ?? false,
      })
      .pipe(map(toMenu));
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
    return this.http.get<PublicMenuWire>(`${this.publicApi}/${slug}`).pipe(map(toPublicMenu));
  }
}

// ---- wire types (priceAmount arrives as a JSON number) ----

type MenuItemWire = Omit<MenuItem, 'priceAmount'> & { priceAmount: number | string };
type MenuWire = Omit<Menu, 'items'> & { items: MenuItemWire[] };
type PublicMenuItemWire = Omit<PublicMenuItem, 'priceAmount'> & { priceAmount: number | string };
type PublicMenuWire = Omit<PublicMenu, 'items' | 'uncategorizedItems'> & {
  items: PublicMenuItemWire[];
  uncategorizedItems: PublicMenuItemWire[];
};

function toItem(raw: MenuItemWire): MenuItem {
  return { ...raw, priceAmount: formatPrice(raw.priceAmount) };
}

function toMenu(raw: MenuWire): Menu {
  return { ...raw, items: raw.items.map(toItem) };
}

function toPublicMenu(raw: PublicMenuWire): PublicMenu {
  const normalize = (i: PublicMenuItemWire): PublicMenuItem => ({ ...i, priceAmount: formatPrice(i.priceAmount) });
  return { ...raw, items: raw.items.map(normalize), uncategorizedItems: raw.uncategorizedItems.map(normalize) };
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
