import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonLabel,
  ActionSheetController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  imagesOutline,
  closeCircleOutline,
  personOutline,
  colorPaletteOutline,
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ImageService } from '../../services/image.service';

export type UploadMode = 'person' | 'fabric';

@Component({
  selector: 'app-image-upload',
  templateUrl: 'image-upload.component.html',
  styleUrls: ['image-upload.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonLabel,
  ],
})
export class ImageUploadComponent {
  @Input() mode: UploadMode = 'person';
  @Input() title = 'Upload Photo';
  @Input() showCatalogue = false;

  @Output() imageSelected = new EventEmitter<string>();
  @Output() openCatalogue = new EventEmitter<void>();

  previewUrl: string | null = null;
  fabricName: string | null = null;

  constructor(
    private readonly imageService: ImageService,
    private readonly actionSheetCtrl: ActionSheetController,
    private readonly toastCtrl: ToastController,
  ) {
    addIcons({
      cameraOutline,
      imagesOutline,
      closeCircleOutline,
      personOutline,
      colorPaletteOutline,
    });
  }

  async captureFromCamera(): Promise<void> {
    await this.captureImage(CameraSource.Camera);
  }

  async captureFromGallery(): Promise<void> {
    await this.captureImage(CameraSource.Photos);
  }

  private async captureImage(source: CameraSource): Promise<void> {
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
      });

      if (!photo.dataUrl) return;

      // Compress and normalize
      const compressed = await this.imageService.compressImage(photo.dataUrl);
      this.previewUrl = this.imageService.base64ToDataUrl(compressed);
      this.fabricName = null;
      this.imageSelected.emit(compressed);
    } catch (error) {
      if ((error as Error).message?.includes('cancelled')) return;
      await this.showError('Failed to load image. Please try again.');
    }
  }

  setFromCatalogue(imageUrl: string, name: string): void {
    this.previewUrl = imageUrl;
    this.fabricName = name;
    // Catalogue uses URL — emit the URL itself (service will handle)
    this.imageSelected.emit(imageUrl);
  }

  clear(): void {
    this.previewUrl = null;
    this.fabricName = null;
    this.imageSelected.emit('');
  }

  private async showError(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom',
    });
    await toast.present();
  }
}
