import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type MenuBuilderSessionData = {
  conversationId: string | null;
  previewUrl?: string;
  claimUrl?: string;
  /** Short human label for the resume banner (first user message). */
  label?: string;
  step: 'business' | 'items' | 'preview';
  expiresAt: string;
  savedAt: string;
};

const STORAGE_KEY = 'nexmenus.menuBuilder.session';
/** Drafts live 72h server-side; the local session must not outlive them. */
const DRAFT_LIFETIME_MS = 72 * 60 * 60 * 1000;

/**
 * Persists the menu-builder chat's recovery payload (preview/claim links,
 * conversation id, step) so a refresh never strands the user without their
 * links (session-recovery plan). The claim URL is a bearer credential, so the
 * session is cleared on expiry and "start over", and never outlives the draft.
 */
@Injectable({ providedIn: 'root' })
export class MenuBuilderSessionService {
  private readonly platformId = inject(PLATFORM_ID);

  load(): MenuBuilderSessionData | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as MenuBuilderSessionData;
      if (!session.expiresAt || new Date(session.expiresAt).getTime() <= Date.now()) {
        this.clear();
        return null;
      }
      return session;
    } catch {
      this.clear();
      return null;
    }
  }

  save(session: Omit<MenuBuilderSessionData, 'savedAt' | 'expiresAt'> & { expiresAt?: string }): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const now = new Date();
    // Keep the original expiry: re-saving must not extend the session past
    // the draft's own 72h server-side lifetime.
    const existing = this.load();
    const data: MenuBuilderSessionData = {
      ...session,
      expiresAt: session.expiresAt ?? existing?.expiresAt
        ?? new Date(now.getTime() + DRAFT_LIFETIME_MS).toISOString(),
      savedAt: now.toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or blocked — recovery is best-effort.
    }
  }

  clear(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
