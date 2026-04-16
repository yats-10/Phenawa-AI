import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';

export interface AdminUser {
  id: string;
  username: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  is_active: boolean;
  access_expires_at: string;
  created_at: string;
  total_generations: number;
  generations_today: number;
  fabrics_count: number;
  last_active: string | null;
}

export interface AdminStats {
  total_generations: number;
  generations_this_month: number;
  generations_today: number;
  fabrics_count: number;
  last_active: string | null;
  top_garment_types: Array<{ type: string; count: number }>;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  access_expires_at: string;
}

export interface UpdateUserPayload {
  is_active?: boolean;
  access_expires_at?: string;
  shop_name?: string;
  owner_name?: string;
  phone?: string;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly storageService: StorageService,
  ) {}

  async login(username: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<{ accessToken: string }>(
        `${this.baseUrl}/admin/login`,
        { username, password },
      ),
    );
    await this.storageService.setAdminToken(response.accessToken);
  }

  async logout(): Promise<void> {
    await this.storageService.clearAdminToken();
  }

  async isLoggedIn(): Promise<boolean> {
    const token = await this.storageService.getAdminToken();
    if (!token) return false;
    return this.storageService.isTokenValid(token);
  }

  async getUsers(): Promise<AdminUser[]> {
    return firstValueFrom(
      this.http.get<AdminUser[]>(`${this.baseUrl}/admin/users`),
    );
  }

  async createUser(payload: CreateUserPayload): Promise<AdminUser> {
    return firstValueFrom(
      this.http.post<AdminUser>(`${this.baseUrl}/admin/users`, payload),
    );
  }

  async updateUser(id: string, payload: UpdateUserPayload): Promise<AdminUser> {
    return firstValueFrom(
      this.http.patch<AdminUser>(`${this.baseUrl}/admin/users/${id}`, payload),
    );
  }

  async getUserStats(id: string): Promise<AdminStats> {
    return firstValueFrom(
      this.http.get<AdminStats>(`${this.baseUrl}/admin/users/${id}/stats`),
    );
  }
}
