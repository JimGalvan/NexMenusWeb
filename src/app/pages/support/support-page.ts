import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-support-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './support-page.html',
  styleUrl: '../terms/terms-page.css',
})
export class SupportPageComponent {
  readonly year = new Date().getFullYear();

  constructor() {
    inject(SeoService).setPage({
      title: 'Support | NexMenus',
      description: 'Get help with NexMenus: contact support, find answers about menus, QR codes, printing, and the ChatGPT plugin.',
      canonicalPath: '/support',
    });
  }
}
