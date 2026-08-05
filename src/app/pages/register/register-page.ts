import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { safeReturnUrl } from '../../core/safe-return-url';
import { LEGAL_VERSIONS } from '../../core/legal-versions';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';

@Component({
  selector: 'app-register-page',
  imports: [FormsModule, RouterLink, BrandLogoComponent],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css',
})
export class RegisterPageComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = signal('');
  password = signal('');
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');
  readonly supportEmail = environment.supportEmail.trim();
  readonly supportHref = `mailto:${this.supportEmail}?subject=${encodeURIComponent('NexMenus support request')}`;

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  submit() {
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password || this.loading()) return;

    this.loading.set(true);
    this.error.set('');
    this.authService
      .register({
        email,
        password,
        termsVersion: LEGAL_VERSIONS.terms,
        privacyVersion: LEGAL_VERSIONS.privacy,
      })
      .subscribe({
        next: () =>
          this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'))),
        error: () => {
          this.loading.set(false);
          this.error.set('Could not create your account. Please try again.');
        },
      });
  }
}
