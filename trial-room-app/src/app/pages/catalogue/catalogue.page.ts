import { Component, OnInit } from '@angular/core';
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
export class CataloguePage implements OnInit {
  readonly CameraSource = CameraSource;

  fabrics: Fabric[] = [];
  isLoading = false;

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

  async ngOnInit(): Promise<void> {
    await this.loadFabrics();
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
      this.fabrics.unshift(fabric);
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
            void this.router.navigate(['/home']);
          },
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
