import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink, BrandLogoComponent],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPageComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

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
    this.authService.login({ email, password }).subscribe({
      next: () => this.router.navigate(['/app']),
      error: () => {
        this.loading.set(false);
        this.error.set('Could not log in. Please try again.');
      },
    });
  }
}
