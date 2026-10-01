import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonText,
  IonModal,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  sparklesOutline,
  downloadOutline,
  shareOutline,
  refreshOutline,
  personOutline,
  menuOutline,
  gridOutline,
} from 'ionicons/icons';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ImageUploadComponent } from '../../components/image-upload/image-upload.component';
import { LoadingOverlayComponent } from '../../components/loading-overlay/loading-overlay.component';
import { GarmentSelectorComponent } from '../../components/garment-selector/garment-selector.component';
import { TryonService } from '../../services/tryon.service';
import { AuthService } from '../../services/auth.service';
import { FabricService } from '../../services/fabric.service';
import { ImageService } from '../../services/image.service';
import { Fabric } from '../../models/fabric.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ImageUploadComponent,
    LoadingOverlayComponent,
    GarmentSelectorComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonText,
    IonModal,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  shopName = '';
  todayCount = 0;

  personImageBase64 = '';
  fabricImageBase64 = '';
  selectedFabricId: string | null = null;
  selectedGarment: string | null = null;

  isLoading = false;
  resultBase64: string | null = null;

  // Catalogue modal
  showCatalogueModal = false;
  catalogueFabrics: Fabric[] = [];

  @ViewChild(ImageUploadComponent) fabricUpload?: ImageUploadComponent;
  @ViewChild('personUploadRef') personUpload?: ImageUploadComponent;

  // UI state for redesigned home page
  menuOpen = false;
  showFullScreen = false;
  selectedGender: 'male' | 'female' | null = 'male';
  personPreviewUrl: string | null = null;
  fabricPreviewUrl: string | null = null;
  selectedFabricName: string | null = null;
  loadingMessage = 'Analyzing your fabric...';

  private readonly loadingMessages = [
    'Analyzing your fabric...',
    'Stitching the garment...',
    'Fitting it on...',
    'Adding final touches...',
  ];
  private loadingMsgIndex = 0;
  private loadingInterval = setInterval(() => {
    this.loadingMsgIndex = (this.loadingMsgIndex + 1) % this.loadingMessages.length;
    this.loadingMessage = this.loadingMessages[this.loadingMsgIndex]!;
  }, 5000);

  maleGarments = [
    { emoji: '👔', label: 'Shirt', value: 'Shirt (Men)' },
    { emoji: '👖', label: 'Pant', value: 'Pant (Men)' },
    { emoji: '🥷', label: 'Kurta', value: 'Kurta (Men)' },
    { emoji: '🎽', label: 'Sherwani', value: 'Sherwani' },
    { emoji: '👘', label: 'Pajama', value: 'Pajama' },
    { emoji: '🤵', label: 'Suit', value: 'Suit (Men)' },
    { emoji: '🧥', label: 'Blazer', value: 'Blazer' },
    { emoji: '🧥', label: 'Coat', value: 'Coat' },
  ];

  femaleGarments = [
    { emoji: '👗', label: 'Kurti', value: 'Kurti (Women)' },
    { emoji: '🥻', label: 'Salwar Kameez', value: 'Salwar Kameez' },
    { emoji: '💃', label: 'Lehenga', value: 'Lehenga' },
    { emoji: '🩱', label: 'Anarkali', value: 'Anarkali' },
    { emoji: '👚', label: 'Kurti Short', value: 'Kurti Short' },
    { emoji: '🪭', label: 'Suit', value: 'Suit (Ladies)' },
  ];

  constructor(
    private readonly tryonService: TryonService,
    private readonly authService: AuthService,
    private readonly fabricService: FabricService,
    private readonly imageService: ImageService,
    private readonly toastCtrl: ToastController,
    private readonly router: Router,
  ) {
    addIcons({
      sparklesOutline,
      downloadOutline,
      shareOutline,
      refreshOutline,
      personOutline,
      menuOutline,
      gridOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const info = await this.authService.getShopInfo();
    if (info) this.shopName = info.shopName;
  }

  get canGenerate(): boolean {
    return (
      !!this.personImageBase64 &&
      (!!this.fabricImageBase64 || !!this.selectedFabricId) &&
      !!this.selectedGarment &&
      !this.isLoading
    );
  }

  onPersonImageSelected(base64: string): void {
    this.personImageBase64 = base64;
    this.resultBase64 = null;
  }

  onFabricImageSelected(value: string): void {
    if (!value) {
      this.fabricImageBase64 = '';
      this.selectedFabricId = null;
      return;
    }
    // If it's a URL (from catalogue), set fabricId; else base64
    if (value.startsWith('http')) {
      this.selectedFabricId = null; // Will be set by selectFabricFromCatalogue
    } else {
      this.fabricImageBase64 = value;
      this.selectedFabricId = null;
    }
    this.resultBase64 = null;
  }

  onGarmentSelected(garment: string): void {
    this.selectedGarment = garment;
    this.resultBase64 = null;
  }

  async openCatalogueModal(): Promise<void> {
    try {
      this.catalogueFabrics = await this.fabricService.getAll();
      this.showCatalogueModal = true;
    } catch {
      await this.showToast('Failed to load catalogue.', 'danger');
    }
  }

  selectFabricFromCatalogue(fabric: Fabric): void {
    this.selectedFabricId = fabric.id;
    this.fabricImageBase64 = '';
    // Update the upload component preview
    const uploadComponents = document.querySelectorAll('app-image-upload');
    // Find the fabric upload component instance through a different approach
    this.showCatalogueModal = false;
    this.resultBase64 = null;
  }

  async generate(): Promise<void> {
    if (!this.canGenerate) return;

    this.isLoading = true;
    this.resultBase64 = null;

    try {
      const response = await this.tryonService.generate({
        personImageBase64: this.personImageBase64,
        fabricImageBase64: this.selectedFabricId
          ? undefined
          : this.fabricImageBase64,
        fabricId: this.selectedFabricId ?? undefined,
        garmentType: this.selectedGarment!,
      });

      this.resultBase64 = response.resultBase64;
      this.todayCount++;
    } catch (error) {
      let message = 'Something went wrong. Please try again.';
      if (error instanceof HttpErrorResponse) {
        message = error.error?.message ?? message;
        if (error.status === 0) {
          message = 'No internet connection. Please check your network.';
        } else if (error.status === 503) {
          message = 'AI is currently busy. Please try again in a moment.';
        }
      }
      await this.showToast(message, 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async saveToGallery(): Promise<void> {
    if (!this.resultBase64) return;
    try {
      await Filesystem.writeFile({
        path: `trial-room-${Date.now()}.jpg`,
        data: this.resultBase64,
        directory: Directory.Cache,
      });
      await this.showToast('Image saved to gallery!', 'success');
    } catch {
      await this.showToast('Failed to save image.', 'danger');
    }
  }

  async shareResult(): Promise<void> {
    if (!this.resultBase64) return;
    try {
      const file = await Filesystem.writeFile({
        path: `trial-room-share-${Date.now()}.jpg`,
        data: this.resultBase64,
        directory: Directory.Cache,
      });
      await Share.share({
        title: 'My Virtual Try-On',
        text: 'Check out how I look in this outfit! Generated by Phenawa AI.',
        files: [file.uri],
        dialogTitle: 'Share your try-on',
      });
    } catch {
      // User cancelled share — no action needed
    }
  }

  newTry(): void {
    this.resultBase64 = null;
    this.personImageBase64 = '';
    this.fabricImageBase64 = '';
    this.selectedFabricId = null;
    this.selectedGarment = null;
  }

  goToCatalogue(): void {
    void this.router.navigate(['/catalogue']);
  }

  goToProfile(): void {
    void this.router.navigate(['/profile']);
  }

  selectGender(gender: 'male' | 'female'): void {
    this.selectedGender = gender;
    this.selectedGarment = null;
  }

  async capturePersonPhoto(source: 'camera' | 'gallery'): Promise<void> {
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      });
      if (!photo.dataUrl) return;
      const base64 = await this.imageService.compressImage(photo.dataUrl);
      this.personPreviewUrl = this.imageService.base64ToDataUrl(base64);
      this.personImageBase64 = base64;
      this.resultBase64 = null;
    } catch (error) {
      if ((error as Error).message?.includes('cancelled')) return;
      await this.showToast('Failed to load image.', 'danger');
    }
  }

  async captureFabricPhoto(source: 'camera' | 'gallery'): Promise<void> {
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      });
      if (!photo.dataUrl) return;
      const base64 = await this.imageService.compressImage(photo.dataUrl);
      this.fabricPreviewUrl = this.imageService.base64ToDataUrl(base64);
      this.fabricImageBase64 = base64;
      this.selectedFabricId = null;
      this.selectedFabricName = null;
      this.resultBase64 = null;
    } catch (error) {
      if ((error as Error).message?.includes('cancelled')) return;
      await this.showToast('Failed to load image.', 'danger');
    }
  }

  clearPersonPhoto(): void {
    this.personPreviewUrl = null;
    this.personImageBase64 = '';
    this.resultBase64 = null;
  }

  clearFabricPhoto(): void {
    this.fabricPreviewUrl = null;
    this.fabricImageBase64 = '';
    this.selectedFabricId = null;
    this.selectedFabricName = null;
    this.resultBase64 = null;
  }

  handleCatalogueSelect(fabric: Fabric): void {
    this.selectedFabricId = fabric.id;
    this.fabricImageBase64 = '';
    this.fabricPreviewUrl = 'data:image/jpeg;base64,' + fabric.imageBase64;
    this.selectedFabricName = fabric.name;
    this.showCatalogueModal = false;
    this.resultBase64 = null;
  }

  resetAll(): void {
    this.newTry();
    this.personPreviewUrl = null;
    this.fabricPreviewUrl = null;
    this.selectedFabricName = null;
    this.selectedGender = 'male';
    this.showFullScreen = false;
  }

  ngOnDestroy(): void {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
