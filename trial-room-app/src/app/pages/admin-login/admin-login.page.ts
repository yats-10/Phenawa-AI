import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AdminService } from '../../services/admin.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-admin-login',
  templateUrl: 'admin-login.page.html',
  styleUrls: ['admin-login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
  ],
})
export class AdminLoginPage {
  username = '';
  password = '';
  showPassword = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private readonly adminService: AdminService,
    private readonly router: Router,
  ) {}

  async login(): Promise<void> {
    if (!this.username.trim() || !this.password) return;
    this.isLoading = true;
    this.errorMessage = '';
    try {
      await this.adminService.login(this.username.trim(), this.password);
      await this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        this.errorMessage = error.error?.message ?? 'Invalid credentials';
      } else {
        this.errorMessage = 'No internet connection.';
      }
    } finally {
      this.isLoading = false;
    }
  }
}
