import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { MenuSummary, menuInitials } from '../../models/menu.model';
import { QrCodeComponent } from '../../components/ui/qr-code/qr-code';
import { BottomSheetComponent } from '../../components/ui/bottom-sheet/bottom-sheet';

@Component({
  selector: 'app-share-page',
  imports: [QrCodeComponent, BottomSheetComponent, RouterLink],
  templateUrl: './share-page.html',
  styleUrl: './share-page.css',
})
export class SharePageComponent {
  private menuService = inject(MenuService);
  private route = inject(ActivatedRoute);

  private qr = viewChild(QrCodeComponent);

  /** All of the owner's menus; the selector picks one to share. */
  readonly menus = signal<MenuSummary[]>([]);
  /** The menu currently being shared. */
  readonly menu = signal<MenuSummary | null>(null);
  /** Whether the menu picker sheet is open. */
  readonly pickerOpen = signal(false);

  readonly initials = computed(() => (this.menu() ? menuInitials(this.menu()!.name) : 'NX'));
  menuInitials = menuInitials;

  /** Human-friendly link shown to the owner and shared on social. */
  readonly publicUrl = computed(() => (this.menu() ? `nexmenus.com/m/${this.menu()!.slug}` : ''));

  /** Value encoded in the QR. The frontend server keeps /r scans on nexmenus.com. */
  readonly qrUrl = computed(() => (this.menu() ? `https://nexmenus.com/r/${this.menu()!.id}/` : ''));

  toast = signal('');

  constructor() {
    this.menuService.listMenus().subscribe(menus => {
      this.menus.set(menus);
      // Honor a ?menu=<id> deep-link (e.g. from the menus page); fall back to the first.
      const wanted = this.route.snapshot.queryParamMap.get('menu');
      this.menu.set(menus.find(m => m.id === wanted) ?? menus[0] ?? null);
    });
  }

  openPicker() {
    if (this.menus().length > 1) this.pickerOpen.set(true);
  }

  selectMenu(menu: MenuSummary) {
    this.menu.set(menu);
    this.pickerOpen.set(false);
  }

  copyLink() {
    if (!this.menu()) return;
    navigator.clipboard?.writeText(`https://${this.publicUrl()}`).catch(() => {});
    this.flash('Link copied');
  }

  async downloadQr() {
    const qr = this.qr();
    const menu = this.menu();
    if (!qr || !menu) return;
    const dataUrl = await qr.toPngDataUrl();
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${slugifyName(menu.name)}-qr.png`;
    link.click();
    this.flash('QR downloaded');
  }

  async printQr() {
    const qr = this.qr();
    const menu = this.menu();
    if (!qr || !menu) return;
    const dataUrl = await qr.toPngDataUrl();
    const win = window.open('', '_blank', 'width=480,height=640');
    if (!win) {
      this.flash('Allow pop-ups to print');
      return;
    }
    win.document.write(`<!doctype html><title>${menu.name} — QR</title>
      <style>
        body{margin:0;display:flex;flex-direction:column;align-items:center;
             justify-content:center;height:100vh;font-family:system-ui,sans-serif}
        img{width:320px;height:320px}
        h1{font-size:18px;margin:16px 0 4px}p{color:#666;margin:0;font-size:13px}
      </style>
      <img src="${dataUrl}" alt="Menu QR code" onload="window.focus();window.print()">
      <h1>${menu.name}</h1><p>Scan to view our menu</p>`);
    win.document.close();
  }

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private flash(msg: string) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set(msg);
    this.toastTimer = setTimeout(() => this.toast.set(''), 1900);
  }
}

/** Filesystem-safe filename stem from a menu name. */
function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'menu'
  );
}

