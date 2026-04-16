import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { JwtPayload } from '../models/user.model';

const TOKEN_KEY = 'auth_token';
const ADMIN_TOKEN_KEY = 'admin_token';

@Injectable({ providedIn: 'root' })
export class StorageService {
  async setToken(token: string): Promise<void> {
    await Preferences.set({ key: TOKEN_KEY, value: token });
  }

  async getToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value;
  }

  async clearToken(): Promise<void> {
    await Preferences.remove({ key: TOKEN_KEY });
  }

  async setAdminToken(token: string): Promise<void> {
    await Preferences.set({ key: ADMIN_TOKEN_KEY, value: token });
  }

  async getAdminToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: ADMIN_TOKEN_KEY });
    return value;
  }

  async clearAdminToken(): Promise<void> {
    await Preferences.remove({ key: ADMIN_TOKEN_KEY });
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(payload) as JwtPayload;
    } catch {
      return null;
    }
  }

  isTokenValid(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload) return false;
    return payload.exp * 1000 > Date.now();
  }
}
