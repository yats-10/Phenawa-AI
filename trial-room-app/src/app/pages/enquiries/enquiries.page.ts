import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, ToastController } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { EnquiryDetail, EnquiryStatus, EnquirySummary, PopularFabric } from '../../models/enquiry.model';
import { EnquiryService } from '../../services/enquiry.service';

type Filter = 'all' | EnquiryStatus;

interface CustomerCard {
  id: string;
  name: string;
  phone: string;
  latestEnquiryId: string;
  latestDate: string;
  interested: number;
  ordered: number;
}

@Component({
  selector: 'app-enquiries',
  templateUrl: 'enquiries.page.html',
  styleUrls: ['enquiries.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
})
export class EnquiriesPage implements OnInit, OnDestroy {
  filter: Filter = 'all';
  enquiries: EnquirySummary[] = [];
  popularFabrics: PopularFabric[] = [];
  selected: EnquiryDetail | null = null;
  isLoading = false;
  isUpdating = false;
  private routeSubscription?: Subscription;

  constructor(
    private readonly enquiryService: EnquiryService,
    private readonly toastCtrl: ToastController,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParamMap.subscribe((params) => {
      const id = params.get('id');
      if (id) void this.openDetail(id);
    });
  }

  ionViewWillEnter(): void {
    void this.loadEnquiries();
    void this.loadPopularFabrics();
  }

  get customers(): CustomerCard[] {
    const cards = new Map<string, CustomerCard>();
    for (const enquiry of this.enquiries) {
      let card = cards.get(enquiry.customerId);
      if (!card) {
        card = {
          id: enquiry.customerId,
          name: enquiry.customerName,
          phone: enquiry.customerPhone,
          latestEnquiryId: enquiry.id,
          latestDate: enquiry.createdAt,
          interested: 0,
          ordered: 0,
        };
        cards.set(enquiry.customerId, card);
      }
      card[enquiry.status]++;
    }
    return Array.from(cards.values());
  }

  get interestedChoices(): EnquirySummary[] {
    return this.selected?.customerHistory.filter((item) => item.status === 'interested') ?? [];
  }

  get orderedChoices(): EnquirySummary[] {
    return this.selected?.customerHistory.filter((item) => item.status === 'ordered') ?? [];
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  async setFilter(filter: Filter): Promise<void> {
    this.filter = filter;
    await this.loadEnquiries();
  }

  async loadEnquiries(): Promise<void> {
    this.isLoading = true;
    try {
      this.enquiries = await this.enquiryService.findAll(
        this.filter === 'all' ? undefined : this.filter,
      );
    } catch {
      await this.toast('Failed to load enquiries.', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async loadPopularFabrics(): Promise<void> {
    try {
      this.popularFabrics = await this.enquiryService.popularFabrics();
    } catch {
      this.popularFabrics = [];
    }
  }

  async openDetail(id: string): Promise<void> {
    try {
      this.selected = await this.enquiryService.findOne(id);
    } catch {
      await this.toast('Failed to load enquiry.', 'danger');
    }
  }

  closeDetail(): void {
    this.selected = null;
    if (this.route.snapshot.queryParamMap.has('id')) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { id: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  async changeStatus(status: EnquiryStatus): Promise<void> {
    if (!this.selected || this.isUpdating || this.selected.status === status) return;
    this.isUpdating = true;
    try {
      this.selected = await this.enquiryService.update(this.selected.id, { status });
      await this.loadEnquiries();
      await this.loadPopularFabrics();
      await this.toast('Status updated.', 'success');
    } catch {
      await this.toast('Failed to update status.', 'danger');
    } finally {
      this.isUpdating = false;
    }
  }

  whatsappUrl(enquiry: EnquiryDetail): string {
    return `https://wa.me/${enquiry.customerPhone}`;
  }

  goBack(): void {
    void this.router.navigate(['/home']);
  }

  private async toast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
