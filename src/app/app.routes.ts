import { Routes } from '@angular/router';
import { LandingPageComponent } from './pages/landing/landing-page';
import { LoginPageComponent } from './pages/login/login-page';
import { RegisterPageComponent } from './pages/register/register-page';
import { TermsPageComponent } from './pages/terms/terms-page';
import { PrivacyPageComponent } from './pages/privacy/privacy-page';
import { AppShellComponent } from './components/layout/app-shell/app-shell';
import { MenusPageComponent } from './pages/menus/menus-page';
import { SharePageComponent } from './pages/share/share-page';
import { AccountPageComponent } from './pages/account/account-page';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '',         component: LandingPageComponent },
  { path: 'login',    component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'terms',    component: TermsPageComponent },
  { path: 'privacy',  component: PrivacyPageComponent },
  {
    path: 'blog',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/blog/blog-index-page').then(m => m.BlogIndexPageComponent),
  },
  {
    path: 'blog/how-to-make-free-digital-menu-for-your-restaurant',
    loadComponent: () =>
      import('./pages/blog/digital-menu-page').then(m => m.DigitalMenuPageComponent),
  },
  {
    path: 'blog/how-to-make-a-free-digital-menu-for-your-restaurant',
    redirectTo: 'blog/how-to-make-free-digital-menu-for-your-restaurant',
    pathMatch: 'full',
  },
  {
    path: 'blog/how-to-make-free-qr-code-menu-for-your-restaurant',
    loadComponent: () =>
      import('./pages/blog/qr-menu-page').then(m => m.QrMenuPageComponent),
  },
  {
    path: 'blog/how-to-make-qr-code-for-your-menu',
    redirectTo: 'blog/how-to-make-free-qr-code-menu-for-your-restaurant',
    pathMatch: 'full',
  },
  {
    path: 'blog/how-to-make-a-qr-code-for-your-menu',
    redirectTo: 'blog/how-to-make-free-qr-code-menu-for-your-restaurant',
    pathMatch: 'full',
  },
  {
    path: 'blog/how-to-make-qr-code-for-you-menu',
    redirectTo: 'blog/how-to-make-free-qr-code-menu-for-your-restaurant',
    pathMatch: 'full',
  },
  {
    path: 'blog/how-to-start-restaurant-california',
    loadComponent: () =>
      import('./pages/blog/restaurant-california-page').then(m => m.RestaurantCaliforniaPageComponent),
  },
  {
    path: 'blog/how-to-create-a-restaurant-menu',
    loadComponent: () =>
      import('./pages/blog/create-menu-page').then(m => m.CreateMenuPageComponent),
  },
  {
    path: 'blog/how-to-create-restaurant-menu',
    redirectTo: 'blog/how-to-create-a-restaurant-menu',
    pathMatch: 'full',
  },
  {
    path: 'blog/how-to-print-menus-for-restaurants',
    loadComponent: () =>
      import('./pages/blog/print-menus-page').then(m => m.PrintMenusPageComponent),
  },
  {
    path: 'blog/how-to-create-printable-restaurant-menus',
    redirectTo: 'blog/how-to-print-menus-for-restaurants',
    pathMatch: 'full',
  },
  {
    path: 'blog/how-to-open-restaurant-california',
    redirectTo: 'blog/how-to-start-restaurant-california',
    pathMatch: 'full',
  },

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

  // Printable / PDF version of the public menu (no auth).
  {
    path: 'm/:slug/print',
    loadComponent: () =>
      import('./pages/print-menu/print-menu-page').then(m => m.PrintMenuPageComponent),
  },

  // Anonymous draft flow (links handed out by the ChatGPT MCP; tokenized, noindex).
  {
    path: 'claim/:token',
    loadComponent: () =>
      import('./pages/claim/claim-page').then(m => m.ClaimPageComponent),
  },
  {
    path: 'preview/:token',
    loadComponent: () =>
      import('./pages/preview/preview-page').then(m => m.PreviewPageComponent),
  },


  { path: '**', redirectTo: '' },
];

