import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { SeoService } from '../../services/seo.service';
import { PublicMenu, PublicMenuItem, menuInitials, priceLabel } from '../../models/menu.model';

interface PrintSection {
  name: string;
  items: PublicMenuItem[];
}

/** Ink-friendly, print-ready view of a public menu ("Ocean & Farm (Printable)"
 *  design). Rendered from the same public data as the diner page so the paper
 *  menu always matches the live one; window.print() produces the PDF. */
@Component({
  selector: 'app-print-menu-page',
  imports: [RouterLink],
  templateUrl: './print-menu-page.html',
  styleUrl: './print-menu-page.css',
})
export class PrintMenuPageComponent {
  private route = inject(ActivatedRoute);
  private menuService = inject(MenuService);
  private seo = inject(SeoService);

  readonly accent = this.menuService.accent;

  readonly slug = this.route.snapshot.paramMap.get('slug')!;
  readonly menu = signal<PublicMenu | null>(null);
  readonly loading = signal(true);

  readonly initials = computed(() => (this.menu() ? menuInitials(this.menu()!.name) : ''));

  /** Categories with at least one item, plus a trailing group for
   *  uncategorized items — same grouping as the diner page's pills. */
  readonly sections = computed<PrintSection[]>(() => {
    const menu = this.menu();
    if (!menu) return [];
    const sections: PrintSection[] = menu.categories
      .map(c => ({ name: c.name, items: menu.items.filter(i => i.categoryId === c.id) }))
      .filter(s => s.items.length > 0);
    if (menu.uncategorizedItems.length) sections.push({ name: 'More', items: menu.uncategorizedItems });
    return sections;
  });

  constructor() {
    this.menuService.getPublicMenu(this.slug).subscribe({
      next: menu => {
        this.menu.set(menu);
        this.seo.setPage({
          title: `${menu.name} Printable Menu | NexMenus`,
          description: `Print the ${menu.name} menu or save it as a clean PDF. This printable restaurant menu stays in sync with the live digital menu.`,
          canonicalPath: `/m/${this.slug}/print`,
          type: 'article',
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  priceLabel = priceLabel;

  print() {
    window.print();
  }
}
