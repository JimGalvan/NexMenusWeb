import { Component, input } from '@angular/core';

/** NexMenus wordmark — "Nex" in brand navy, "Menus" in muted grey. */
@Component({
  selector: 'app-brand-logo',
  imports: [],
  templateUrl: './brand-logo.html',
  styleUrl: './brand-logo.css',
})
export class BrandLogoComponent {
  /** Font size in px. */
  size = input(21);
}
