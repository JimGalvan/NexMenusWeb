import { Component, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { BrandLogoComponent } from '../../ui/brand-logo/brand-logo';
import { ReportIssueButtonComponent } from '../../ui/report-issue-button/report-issue-button';

@Component({
  selector: 'app-app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandLogoComponent, ReportIssueButtonComponent],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShellComponent {
  private authService = inject(AuthService);

  constructor() {
    // The cached account survives reloads, so a plan changed on the server —
    // an upgrade granted by hand, or a lapsed subscription — would otherwise
    // stay invisible until the next log in. Refresh once when the authenticated
    // shell mounts; failure is fine, the cached copy still renders.
    if (this.authService.isAuthenticated()) {
      this.authService.loadCurrentAccount().subscribe({ error: () => {} });
    }
  }

  readonly accountEmail = computed(() => this.authService.account()?.email ?? 'Account');

  readonly initials = computed(() => {
    const email = this.authService.account()?.email ?? '';
    return email.slice(0, 2).toUpperCase() || 'NX';
  });
}
