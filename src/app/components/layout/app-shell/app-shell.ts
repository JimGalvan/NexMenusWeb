import { Component, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { BrandLogoComponent } from '../../ui/brand-logo/brand-logo';

@Component({
  selector: 'app-app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandLogoComponent],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShellComponent {
  private authService = inject(AuthService);

  readonly initials = computed(() => {
    const email = this.authService.account()?.email ?? '';
    return email.slice(0, 2).toUpperCase() || 'NX';
  });
}
