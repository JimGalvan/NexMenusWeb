import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuBuilderComponent } from '../../components/menu-builder/menu-builder';
import {
  AccountBuilderConversation,
  MenuBuilderService,
} from '../../services/menu-builder.service';
import { MenuService } from '../../services/menu.service';
import { MenuSummary } from '../../models/menu.model';

@Component({
  selector: 'app-account-menu-builder-page',
  imports: [FormsModule, MenuBuilderComponent],
  templateUrl: './account-menu-builder-page.html',
  styleUrl: './account-menu-builder-page.css',
})
export class AccountMenuBuilderPageComponent {
  @ViewChild(MenuBuilderComponent) private builder?: MenuBuilderComponent;

  private readonly service = inject(MenuBuilderService);
  private readonly router = inject(Router);
  private readonly menusService = inject(MenuService);

  readonly conversations = signal<AccountBuilderConversation[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly historyLoading = signal(true);
  readonly menus = signal<MenuSummary[]>([]);
  readonly targetMenuId = signal<string | null>(null);
  readonly targetMenu = computed(() =>
    this.menus().find(menu => menu.id === this.targetMenuId()) ?? null);

  constructor() {
    this.reloadHistory();
    this.menusService.listMenus().subscribe({ next: menus => this.menus.set(menus) });
  }

  selectTarget(menuId: string): void {
    this.targetMenuId.set(menuId || null);
    this.selectedId.set(null);
    this.builder?.reset();
  }

  openConversation(conversation: AccountBuilderConversation): void {
    if (conversation.menuId && conversation.status === 'COMPLETED') {
      void this.router.navigate(['/editor', conversation.menuId]);
      return;
    }
    this.targetMenuId.set(conversation.menuId ?? null);
    this.selectedId.set(conversation.id);
  }

  onMenuCreated(menuId: string): void {
    void this.router.navigate(['/editor', menuId]);
  }

  reloadHistory(): void {
    this.service.listAccountConversations().subscribe({
      next: conversations => {
        this.conversations.set(conversations);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  updatedLabel(value: string): string {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
