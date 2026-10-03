import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.page').then((m) => m.HomePage),
    canActivate: [AuthGuard],
  },
  {
    path: 'catalogue',
    loadComponent: () =>
      import('./pages/catalogue/catalogue.page').then((m) => m.CataloguePage),
    canActivate: [AuthGuard],
  },
  {
    path: 'enquiries',
    loadComponent: () =>
      import('./pages/enquiries/enquiries.page').then((m) => m.EnquiriesPage),
    canActivate: [AuthGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile.page').then((m) => m.ProfilePage),
    canActivate: [AuthGuard],
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./pages/admin-login/admin-login.page').then(
        (m) => m.AdminLoginPage,
      ),
  },
  {
    path: 'admin/dashboard',
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard.page').then(
        (m) => m.AdminDashboardPage,
      ),
    canActivate: [AdminGuard],
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
