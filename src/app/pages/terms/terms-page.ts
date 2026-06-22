import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';

@Component({
  selector: 'app-terms-page',
  imports: [RouterLink, BrandLogoComponent],
  templateUrl: './terms-page.html',
  styleUrl: './terms-page.css',
})
export class TermsPageComponent {
  readonly year = new Date().getFullYear();
}
