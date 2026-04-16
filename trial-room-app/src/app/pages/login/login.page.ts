import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
  ],
})
export class LoginPage {
  username = '';
  password = '';
  showPassword = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async login(): Promise<void> {
    if (!this.username.trim() || !this.password) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.login(this.username.trim(), this.password);
      await this.router.navigate(['/home'], { replaceUrl: true });
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        this.errorMessage =
          error.error?.message ??
          'Something went wrong. Please try again.';
      } else {
        this.errorMessage = 'No internet connection. Please check your network.';
      }
    } finally {
      this.isLoading = false;
    }
  }
}
