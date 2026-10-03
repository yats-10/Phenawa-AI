import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
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
import { EnquiryService } from '../../services/enquiry.service';
import { EnquiryStatus } from '../../models/enquiry.model';
import { Fabric } from '../../models/fabric.model';
import { HttpErrorResponse } from '@angular/common/http';

interface GarmentOption {
  label: string;
  value: string;
  emoji?: string;
  icon?: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
  generationId: string | null = null;
  savedEnquiryId: string | null = null;
  showEnquiryForm = false;
  isSavingEnquiry = false;
  enquiryName = '';
  enquiryPhone = '';
  enquiryStatus: EnquiryStatus = 'interested';
  customerLookupState: 'idle' | 'checking' | 'found' | 'new' | 'error' = 'idle';
  existingCustomerName = '';
  private customerLookupTimer?: ReturnType<typeof setTimeout>;
  private customerLookupSequence = 0;

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
  private fabricRouteSubscription?: Subscription;
  private loadingInterval = setInterval(() => {
    this.loadingMsgIndex = (this.loadingMsgIndex + 1) % this.loadingMessages.length;
    this.loadingMessage = this.loadingMessages[this.loadingMsgIndex]!;
  }, 5000);

  maleGarments: GarmentOption[] = [
    { emoji: '👔', label: 'Shirt', value: 'Shirt (Men)' },
    { emoji: '👖', label: 'Pant', value: 'Pant (Men)' },
    { icon: 'assets/garments/kurta.png', label: 'Kurta', value: 'Kurta (Men)' },
    { icon: 'assets/garments/sherwani.png', label: 'Sherwani', value: 'Sherwani' },
    { icon: 'assets/garments/pajama.png', label: 'Pajama', value: 'Pajama' },
    { emoji: '🤵', label: 'Suit', value: 'Suit (Men)' },
    { icon: 'assets/garments/blazer.png', label: 'Blazer', value: 'Blazer' },
    { emoji: '🧥', label: 'Coat', value: 'Coat' },
  ];

  femaleGarments: GarmentOption[] = [
    { icon: 'assets/garments/kurti.png', label: 'Kurti', value: 'Kurti (Women)' },
    { icon: 'assets/garments/salwar-kameez.png', label: 'Salwar Kameez', value: 'Salwar Kameez' },
    { icon: 'assets/garments/lehenga.png', label: 'Lehenga', value: 'Lehenga' },
    { icon: 'assets/garments/anarkali.png', label: 'Anarkali', value: 'Anarkali' },
    { emoji: '👚', label: 'Kurti Short', value: 'Kurti Short' },
    { icon: 'assets/garments/ladies-suit.png', label: 'Suit', value: 'Suit (Ladies)' },
  ];

  constructor(
    private readonly tryonService: TryonService,
    private readonly authService: AuthService,
    private readonly fabricService: FabricService,
    private readonly imageService: ImageService,
    private readonly enquiryService: EnquiryService,
    private readonly toastCtrl: ToastController,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
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
    this.fabricRouteSubscription = this.route.queryParamMap.subscribe((params) => {
      const fabricId = params.get('fabricId');
      if (fabricId) void this.selectCatalogueFabricById(fabricId);
    });
    const info = await this.authService.getShopInfo();
    if (info) this.shopName = info.shopName;
  }

  private async selectCatalogueFabricById(fabricId: string): Promise<void> {
    try {
      const fabrics = await this.fabricService.getAll();
      const fabric = fabrics.find((item) => item.id === fabricId);
      if (!fabric) {
        await this.showToast('Fabric not found in your catalogue.', 'danger');
        return;
      }
      this.handleCatalogueSelect(fabric);
    } catch {
      await this.showToast('Failed to load fabric.', 'danger');
    }
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
    this.generationId = null;
    this.savedEnquiryId = null;

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
      this.generationId = response.generationId;
      this.selectedFabricId = response.fabricId;
      this.selectedFabricName = response.fabricName;
      this.fabricImageBase64 = '';
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

  openEnquiryForm(): void {
    if (!this.resultBase64 || !this.generationId) return;
    this.clearCustomerLookup();
    this.enquiryName = '';
    this.enquiryPhone = '';
    this.enquiryStatus = 'interested';
    this.customerLookupState = 'idle';
    this.existingCustomerName = '';
    this.showEnquiryForm = true;
  }

  onEnquiryPhoneChange(value: string): void {
    this.enquiryPhone = value;
    this.clearCustomerLookup();
    this.existingCustomerName = '';
    this.enquiryName = '';
    const digits = value.replace(/\D/g, '');
    if (!/^(?:[6-9]\d{9}|0[6-9]\d{9}|91[6-9]\d{9})$/.test(digits)) {
      this.customerLookupState = 'idle';
      return;
    }
    this.customerLookupState = 'checking';
    const sequence = this.customerLookupSequence;
    this.customerLookupTimer = setTimeout(() => {
      void this.lookupCustomer(value, sequence);
    }, 350);
  }

  private async lookupCustomer(phone: string, sequence: number): Promise<void> {
    try {
      const result = await this.enquiryService.lookupCustomer(phone);
      if (sequence !== this.customerLookupSequence) return;
      if (result.exists && result.customer) {
        this.customerLookupState = 'found';
        this.existingCustomerName = result.customer.name;
      } else {
        this.customerLookupState = 'new';
      }
    } catch {
      if (sequence === this.customerLookupSequence) this.customerLookupState = 'error';
    }
  }

  private clearCustomerLookup(): void {
    if (this.customerLookupTimer) clearTimeout(this.customerLookupTimer);
    this.customerLookupSequence++;
  }

  async saveEnquiry(): Promise<void> {
    if (
      !this.resultBase64 || !this.generationId || this.isSavingEnquiry ||
      (this.customerLookupState !== 'found' && this.customerLookupState !== 'new') ||
      (this.customerLookupState === 'new' && !this.enquiryName.trim())
    ) return;
    this.isSavingEnquiry = true;
    try {
      const enquiry = await this.enquiryService.create({
        generationId: this.generationId,
        customerName: this.customerLookupState === 'new' ? this.enquiryName.trim() : undefined,
        customerPhone: this.enquiryPhone.trim(),
        status: this.enquiryStatus,
      });
      this.savedEnquiryId = enquiry.id;
      this.showEnquiryForm = false;
      await this.showToast('Saved to customer profile.', 'success');
    } catch (error) {
      const message = error instanceof HttpErrorResponse
        ? error.error?.message ?? 'Failed to save enquiry.'
        : 'Failed to save enquiry.';
      await this.showToast(Array.isArray(message) ? message.join(' ') : message, 'danger');
    } finally {
      this.isSavingEnquiry = false;
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
    this.generationId = null;
    this.savedEnquiryId = null;
    this.showEnquiryForm = false;
    this.personImageBase64 = '';
    this.fabricImageBase64 = '';
    this.selectedFabricId = null;
    this.selectedGarment = null;
  }

  goToCatalogue(): void {
    void this.router.navigate(['/catalogue']);
  }

  goToEnquiries(): void {
    void this.router.navigate(['/enquiries']);
  }

  viewSavedEnquiry(): void {
    if (!this.savedEnquiryId) return;
    void this.router.navigate(['/enquiries'], {
      queryParams: { id: this.savedEnquiryId },
    });
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
    this.clearCustomerLookup();
    this.fabricRouteSubscription?.unsubscribe();
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
