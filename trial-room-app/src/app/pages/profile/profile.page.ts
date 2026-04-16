import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  AlertController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { TryonService } from '../../services/tryon.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
  ],
})
export class ProfilePage implements OnInit {
  shopName = '';
  username = '';
  accessExpiresAt: Date | null = null;
  totalGenerations = 0;
  appVersion = '1.0.0';
  adminPhone = environment.adminPhone;

  get expiryColor(): string {
    if (!this.accessExpiresAt) return 'medium';
    const now = new Date();
    const diff = this.accessExpiresAt.getTime() - now.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 0) return 'danger';
    if (days < 30) return 'warning';
    return 'success';
  }

  constructor(
    private readonly authService: AuthService,
    private readonly storageService: StorageService,
    private readonly tryonService: TryonService,
    private readonly alertCtrl: AlertController,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const token = await this.storageService.getToken();
    if (token) {
      const payload = this.storageService.decodeToken(token);
      if (payload) {
        this.shopName = payload.shopName;
        this.username = payload.username;
        this.accessExpiresAt = new Date(payload.accessExpiresAt);
      }
    }

    try {
      this.totalGenerations = await this.tryonService.getTotalCount();
    } catch {
      // Non-critical — ignore
    }
  }

  async logout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Logout',
          role: 'destructive',
          handler: async () => {
            await this.authService.logout();
            await this.router.navigate(['/login'], { replaceUrl: true });
          },
        },
      ],
    });
    await alert.present();
  }

  goBack(): void {
    void this.router.navigate(['/home']);
  }
}
