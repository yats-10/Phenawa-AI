import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';
import { LoginResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly storageService: StorageService,
  ) {}

  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, {
        username,
        password,
      }),
    );
    await this.storageService.setToken(response.accessToken);
    return response;
  }

  async logout(): Promise<void> {
    await this.storageService.clearToken();
  }

  async isLoggedIn(): Promise<boolean> {
    const token = await this.storageService.getToken();
    if (!token) return false;
    return this.storageService.isTokenValid(token);
  }

  async getShopInfo(): Promise<{ shopName: string; username: string } | null> {
    const token = await this.storageService.getToken();
    if (!token) return null;
    const payload = this.storageService.decodeToken(token);
    if (!payload) return null;
    return { shopName: payload.shopName, username: payload.username };
  }
}
