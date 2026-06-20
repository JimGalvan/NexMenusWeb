import { Component, computed, inject, signal } from '@angular/core';
import { MenuService } from '../../services/menu.service';
import { MenuSummary, menuInitials } from '../../models/menu.model';
import { QrCodeComponent } from '../../components/ui/qr-code/qr-code';

@Component({
  selector: 'app-share-page',
  imports: [QrCodeComponent],
  templateUrl: './share-page.html',
  styleUrl: './share-page.css',
})
export class SharePageComponent {
  private menuService = inject(MenuService);

  // The most recently updated menu stands in for the (not yet built) selector.
  readonly menu = signal<MenuSummary | null>(null);
  readonly initials = computed(() => (this.menu() ? menuInitials(this.menu()!.name) : 'NX'));
  readonly publicUrl = computed(() => (this.menu() ? `nexmenus.com/m/${this.menu()!.slug}` : ''));

  toast = signal('');

  constructor() {
    this.menuService.listMenus().subscribe(menus => this.menu.set(menus[0] ?? null));
  }

  copyLink() {
    if (!this.menu()) return;
    navigator.clipboard?.writeText(`https://${this.publicUrl()}`).catch(() => {});
    this.flash('Link copied');
  }

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private flash(msg: string) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set(msg);
    this.toastTimer = setTimeout(() => this.toast.set(''), 1900);
  }
}
