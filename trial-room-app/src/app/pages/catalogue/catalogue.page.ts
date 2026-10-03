import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  ToastController,
  ActionSheetController,
} from '@ionic/angular/standalone';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FabricService } from '../../services/fabric.service';
import { ImageService } from '../../services/image.service';
import { Fabric } from '../../models/fabric.model';

@Component({
  selector: 'app-catalogue',
  templateUrl: 'catalogue.page.html',
  styleUrls: ['catalogue.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
  ],
})
export class CataloguePage {
  readonly CameraSource = CameraSource;

  fabrics: Fabric[] = [];
  isLoading = false;
  sortBy: 'recent' | 'popular' = 'recent';
  showRenameModal = false;
  renamingFabric: Fabric | null = null;
  renameFabricName = '';
  isRenaming = false;

  // Add fabric modal
  showAddModal = false;
  newFabricName = '';
  newFabricPreview: string | null = null;
  newFabricBase64 = '';
  isSaving = false;

  constructor(
    private readonly fabricService: FabricService,
    private readonly imageService: ImageService,
    private readonly toastCtrl: ToastController,
    private readonly actionSheetCtrl: ActionSheetController,
    private readonly router: Router,
  ) {}

  async ionViewWillEnter(): Promise<void> {
    await this.loadFabrics();
  }

  get sortedFabrics(): Fabric[] {
    return [...this.fabrics].sort((a, b) => this.compareFabrics(a, b, this.sortBy));
  }

  get topPopularFabricId(): string | null {
    const top = [...this.fabrics].sort((a, b) => this.compareFabrics(a, b, 'popular'))[0];
    return top && top.interestedCount + top.orderedCount > 0 ? top.id : null;
  }

  private compareFabrics(a: Fabric, b: Fabric, sortBy: 'recent' | 'popular'): number {
    if (sortBy === 'popular') {
      const aTotal = a.interestedCount + a.orderedCount;
      const bTotal = b.interestedCount + b.orderedCount;
      if (aTotal !== bTotal) return bTotal - aTotal;
      if (a.orderedCount !== b.orderedCount) return b.orderedCount - a.orderedCount;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }

  async loadFabrics(): Promise<void> {
    this.isLoading = true;
    try {
      this.fabrics = await this.fabricService.getAll();
    } catch {
      await this.showToast('Failed to load fabrics.', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  openAddModal(): void {
    this.newFabricName = '';
    this.newFabricPreview = null;
    this.newFabricBase64 = '';
    this.showAddModal = true;
  }

  async pickPhoto(source: CameraSource): Promise<void> {
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
      });
      if (!photo.dataUrl) return;
      const compressed = await this.imageService.compressImage(photo.dataUrl);
      this.newFabricPreview = this.imageService.base64ToDataUrl(compressed);
      this.newFabricBase64 = compressed;
    } catch (error) {
      if ((error as Error).message?.includes('cancelled')) return;
      await this.showToast('Failed to load image.', 'danger');
    }
  }

  async saveFabric(): Promise<void> {
    if (!this.newFabricName.trim() || !this.newFabricBase64) return;

    this.isSaving = true;
    try {
      const fabric = await this.fabricService.create({
        name: this.newFabricName.trim(),
        imageBase64: this.newFabricBase64,
      });
      this.fabrics.unshift({ ...fabric, interestedCount: 0, orderedCount: 0 });
      this.showAddModal = false;
      await this.showToast('Fabric added!', 'success');
    } catch {
      await this.showToast('Failed to save fabric.', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  async showFabricOptions(fabric: Fabric): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: fabric.name,
      buttons: [
        {
          text: 'Use in Try-On',
          icon: 'color-palette-outline',
          handler: () => {
            void this.router.navigate(['/home'], {
              queryParams: { fabricId: fabric.id },
            });
          },
        },
        {
          text: 'Rename',
          icon: 'create-outline',
          handler: () => this.openRenameModal(fabric),
        },
        {
          text: 'Delete',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            void this.deleteFabric(fabric);
          },
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  openRenameModal(fabric: Fabric): void {
    this.renamingFabric = fabric;
    this.renameFabricName = fabric.name;
    this.showRenameModal = true;
  }

  closeRenameModal(): void {
    if (this.isRenaming) return;
    this.showRenameModal = false;
    this.renamingFabric = null;
  }

  async saveRename(): Promise<void> {
    const name = this.renameFabricName.trim();
    if (!this.renamingFabric || !name || this.isRenaming) return;
    this.isRenaming = true;
    try {
      const updated = await this.fabricService.rename(this.renamingFabric.id, name);
      this.fabrics = this.fabrics.map((fabric) =>
        fabric.id === updated.id ? { ...fabric, name: updated.name } : fabric,
      );
      this.showRenameModal = false;
      this.renamingFabric = null;
      await this.showToast('Fabric renamed.', 'success');
    } catch {
      await this.showToast('Failed to rename fabric.', 'danger');
    } finally {
      this.isRenaming = false;
    }
  }

  async deleteFabric(fabric: Fabric): Promise<void> {
    try {
      await this.fabricService.delete(fabric.id);
      this.fabrics = this.fabrics.filter((f) => f.id !== fabric.id);
      await this.showToast('Fabric deleted.', 'success');
    } catch {
      await this.showToast('Failed to delete fabric.', 'danger');
    }
  }

  goBack(): void {
    void this.router.navigate(['/home']);
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
