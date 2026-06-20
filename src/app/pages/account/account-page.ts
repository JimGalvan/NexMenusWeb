import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-account-page',
  imports: [],
  templateUrl: './account-page.html',
  styleUrl: './account-page.css',
})
export class AccountPageComponent {
  private authService = inject(AuthService);

  readonly account = this.authService.account;
  readonly email = computed(() => this.account()?.email ?? '');
  // The accounts API has no display name, so derive one from the email local part.
  readonly name = computed(() => this.email().split('@')[0] || 'Your account');
  readonly initials = computed(() => this.email().slice(0, 2).toUpperCase() || 'NX');

  logout() {
    this.authService.logout();
  }
}
