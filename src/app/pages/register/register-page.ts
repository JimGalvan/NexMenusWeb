import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
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

  email = signal('');
  password = signal('');
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  submit() {
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password || this.loading()) return;

    this.loading.set(true);
    this.error.set('');
    this.authService.register({ email, password }).subscribe({
      next: () => this.router.navigate(['/app']),
      error: () => {
        this.loading.set(false);
        this.error.set('Could not create your account. Please try again.');
      },
    });
  }
}
