import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-blog-index-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './blog-index-page.html',
  styleUrl: './restaurant-california-page.css',
})
export class BlogIndexPageComponent {
  readonly year = new Date().getFullYear();

  constructor(private seo: SeoService) {
    this.seo.setPage({
      title: 'Blog | NexMenus',
      description:
        'Restaurant menu guides from NexMenus, including printable menus, QR menus, and restaurant launch resources.',
      canonicalPath: '/blog/',
    });
  }
}
