import { Routes } from '@angular/router';
import { LandingPageComponent } from './pages/landing/landing-page';
import { LoginPageComponent } from './pages/login/login-page';
import { RegisterPageComponent } from './pages/register/register-page';
import { AppShellComponent } from './components/layout/app-shell/app-shell';
import { MenusPageComponent } from './pages/menus/menus-page';
import { SharePageComponent } from './pages/share/share-page';
import { AccountPageComponent } from './pages/account/account-page';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '',         component: LandingPageComponent },
  { path: 'login',    component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },

  // Authenticated app — tabbed shell (Menus / QR & Share / Account).
  {
    path: 'app',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '',        redirectTo: 'menus', pathMatch: 'full' },
      { path: 'menus',   component: MenusPageComponent },
      { path: 'share',   component: SharePageComponent },
      { path: 'account', component: AccountPageComponent },
    ],
  },

  // Full-screen menu editor (outside the tab shell).
  {
    path: 'editor/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/editor/editor-page').then(m => m.EditorPageComponent),
  },

  // Public diner-facing menu (no auth).
  {
    path: 'm/:slug',
    loadComponent: () =>
      import('./pages/public-menu/public-menu-page').then(m => m.PublicMenuPageComponent),
  },

  { path: '**', redirectTo: '' },
];
