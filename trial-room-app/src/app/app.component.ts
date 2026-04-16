import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { StorageService } from './services/storage.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private readonly storageService: StorageService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    // Don't auto-redirect if user is trying to access admin routes
    if (window.location.pathname.startsWith('/admin')) {
      return;
    }

    const token = await this.storageService.getToken();
    if (token) {
      await this.router.navigate(['/home'], { replaceUrl: true });
    } else {
      await this.router.navigate(['/login'], { replaceUrl: true });
    }
  }
}
