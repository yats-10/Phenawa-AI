import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonModal,
  IonItem,
  IonLabel,
  IonInput,
  IonSpinner,
  IonBadge,
  IonSearchbar,
  IonToggle,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline,
  eyeOutline,
  eyeOffOutline,
} from 'ionicons/icons';
import {
  AdminService,
  AdminUser,
  AdminStats,
  CreateUserPayload,
  UpdateUserPayload,
} from '../../services/admin.service';
import { HttpErrorResponse } from '@angular/common/http';

type FilterType = 'all' | 'active' | 'inactive' | 'expiring' | 'expired';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: 'admin-dashboard.page.html',
  styleUrls: ['admin-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonModal,
    IonItem,
    IonLabel,
    IonInput,
    IonSpinner,
    IonBadge,
    IonSearchbar,
    IonToggle,
  ],
})
export class AdminDashboardPage implements OnInit {
  @ViewChild('editModal') editModalRef!: IonModal;
  @ViewChild('createModal') createModalRef!: IonModal;
  @ViewChild('statsModal') statsModalRef!: IonModal;

  allUsers: AdminUser[] = [];
  filteredUsers: AdminUser[] = [];
  isLoading = false;
  searchQuery = '';
  activeFilter: FilterType = 'all';

  // Create modal
  createPayload: CreateUserPayload = this.emptyCreatePayload();
  showCreatePassword = false;
  isSaving = false;

  // Edit modal
  editUser: AdminUser | null = null;
  editPayload: UpdateUserPayload & { new_password?: string } = {};
  showEditPassword = false;
  isUpdating = false;

  // Stats modal
  statsUser: AdminUser | null = null;
  statsData: AdminStats | null = null;
  isLoadingStats = false;

  constructor(
    private readonly adminService: AdminService,
    private readonly toastCtrl: ToastController,
    private readonly router: Router,
  ) {
    addIcons({
      createOutline,
      eyeOutline,
      eyeOffOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  // ---- Stats ----
  get totalShops(): number { return this.allUsers.length; }
  get activeShops(): number {
    const now = new Date();
    return this.allUsers.filter(
      (u) => u.is_active && new Date(u.access_expires_at) > now,
    ).length;
  }
  get expiringSoon(): number {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.allUsers.filter(
      (u) =>
        u.is_active &&
        new Date(u.access_expires_at) > now &&
        new Date(u.access_expires_at) < sevenDays,
    ).length;
  }
  get expiredShops(): number {
    return this.allUsers.filter(
      (u) => new Date(u.access_expires_at) < new Date(),
    ).length;
  }
  get totalTodayGenerations(): number {
    return this.allUsers.reduce((sum, u) => sum + u.generations_today, 0);
  }

  // ---- Filtering ----
  applyFilter(): void {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const query = this.searchQuery.toLowerCase().trim();

    this.filteredUsers = this.allUsers.filter((u) => {
      const matchesSearch =
        !query ||
        u.shop_name.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        u.phone.includes(query);

      const expiry = new Date(u.access_expires_at);
      let matchesFilter = true;
      switch (this.activeFilter) {
        case 'active':
          matchesFilter = u.is_active && expiry > now;
          break;
        case 'inactive':
          matchesFilter = !u.is_active;
          break;
        case 'expiring':
          matchesFilter = u.is_active && expiry > now && expiry < sevenDays;
          break;
        case 'expired':
          matchesFilter = expiry < now;
          break;
      }

      return matchesSearch && matchesFilter;
    });
  }

  setFilter(filter: FilterType): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  onSearch(event: CustomEvent): void {
    this.searchQuery = (event.detail as { value: string }).value ?? '';
    this.applyFilter();
  }

  // ---- Status helpers ----
  getUserStatus(user: AdminUser): 'Active' | 'Inactive' | 'Expired' {
    if (!user.is_active) return 'Inactive';
    if (new Date(user.access_expires_at) < new Date()) return 'Expired';
    return 'Active';
  }

  getStatusColor(user: AdminUser): string {
    const status = this.getUserStatus(user);
    if (status === 'Active') return 'success';
    if (status === 'Inactive') return 'medium';
    return 'danger';
  }

  getExpiryColor(user: AdminUser): string {
    const now = new Date();
    const expiry = new Date(user.access_expires_at);
    const days = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (days < 0) return 'danger';
    if (days < 7) return 'warning';
    return 'success';
  }

  getLastActive(user: AdminUser): string {
    if (!user.last_active) return 'Never';
    const diff = Date.now() - new Date(user.last_active).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  // ---- Actions ----
  async loadUsers(): Promise<void> {
    this.isLoading = true;
    try {
      this.allUsers = await this.adminService.getUsers();
      this.applyFilter();
    } catch {
      await this.showToast('Failed to load users.', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async toggleActive(user: AdminUser): Promise<void> {
    try {
      const updated = await this.adminService.updateUser(user.id, {
        is_active: !user.is_active,
      });
      const idx = this.allUsers.findIndex((u) => u.id === user.id);
      if (idx >= 0) this.allUsers[idx] = { ...this.allUsers[idx]!, is_active: updated.is_active };
      this.applyFilter();
    } catch {
      await this.showToast('Failed to update status.', 'danger');
    }
  }

  async openEditModal(user: AdminUser): Promise<void> {
    this.editUser = user;
    const d = new Date(user.access_expires_at);
    this.editPayload = {
      shop_name: user.shop_name,
      owner_name: user.owner_name,
      phone: user.phone,
      is_active: user.is_active,
      access_expires_at: d.toISOString().split('T')[0],
      new_password: '',
    };
    await this.editModalRef.present();
  }

  extendAccess(days: number): void {
    const base = this.editPayload.access_expires_at
      ? new Date(this.editPayload.access_expires_at)
      : new Date();
    // If expired, extend from today
    if (base < new Date()) {
      base.setTime(new Date().getTime());
    }
    base.setDate(base.getDate() + days);
    this.editPayload.access_expires_at = base.toISOString().split('T')[0];
  }

  async saveEdit(): Promise<void> {
    if (!this.editUser) return;
    this.isUpdating = true;
    try {
      const payload: UpdateUserPayload = {
        shop_name: this.editPayload.shop_name,
        owner_name: this.editPayload.owner_name,
        phone: this.editPayload.phone,
        is_active: this.editPayload.is_active,
        access_expires_at: this.editPayload.access_expires_at,
      };
      if (this.editPayload.new_password?.trim()) {
        payload.password = this.editPayload.new_password;
      }
      const updated = await this.adminService.updateUser(
        this.editUser.id,
        payload,
      );
      const idx = this.allUsers.findIndex((u) => u.id === this.editUser!.id);
      if (idx >= 0) {
        this.allUsers[idx] = {
          ...this.allUsers[idx]!,
          shop_name: updated.shop_name,
          owner_name: updated.owner_name,
          phone: updated.phone,
          is_active: updated.is_active,
          access_expires_at: updated.access_expires_at,
        };
      }
      this.applyFilter();
      await this.editModalRef.dismiss();
      await this.showToast('User updated successfully!', 'success');
    } catch (error) {
      const msg =
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? 'Failed to update user.')
          : 'Failed to update user.';
      await this.showToast(msg, 'danger');
    } finally {
      this.isUpdating = false;
    }
  }

  async openCreateModal(): Promise<void> {
    this.createPayload = this.emptyCreatePayload();
    this.showCreatePassword = false;
    await this.createModalRef.present();
  }

  async openStatsModal(user: AdminUser): Promise<void> {
    this.statsUser = user;
    this.statsData = null;
    this.isLoadingStats = true;
    await this.statsModalRef.present();
    try {
      this.statsData = await this.adminService.getUserStats(user.id);
    } catch {
      await this.showToast('Failed to load user stats.', 'danger');
      await this.statsModalRef.dismiss();
    } finally {
      this.isLoadingStats = false;
    }
  }

  autoSuggestUsername(): void {
    if (!this.createPayload.username) {
      this.createPayload.username = this.createPayload.shop_name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    }
  }

  async createUser(): Promise<void> {
    this.isSaving = true;
    try {
      const newUser = await this.adminService.createUser(this.createPayload);
      this.allUsers.unshift({ ...newUser, total_generations: 0, generations_today: 0, fabrics_count: 0, last_active: null });
      this.applyFilter();
      await this.createModalRef.dismiss();
      await this.showToast('Shop created successfully!', 'success');
    } catch (error) {
      const msg =
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? 'Failed to create user.')
          : 'Failed to create user.';
      await this.showToast(msg, 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  async logout(): Promise<void> {
    await this.adminService.logout();
    await this.router.navigate(['/admin/login'], { replaceUrl: true });
  }

  private emptyCreatePayload(): CreateUserPayload {
    return {
      username: '',
      password: '',
      shop_name: '',
      owner_name: '',
      phone: '',
      access_expires_at: '',
    };
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
