import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-qr-redirect-page',
  template: `
    <main class="qr-redirect">
      <p>Opening menu...</p>
    </main>
  `,
  styles: [
    `
      .qr-redirect {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: system-ui, sans-serif;
        color: #52525b;
      }
    `,
  ],
})
export class QrRedirectPageComponent {
  private route = inject(ActivatedRoute);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      window.location.replace('/');
      return;
    }

    const apiOrigin = environment.apiBaseUrl.replace(/\/$/, '');
    window.location.replace(`${apiOrigin}/r/${encodeURIComponent(id)}/`);
  }
}
