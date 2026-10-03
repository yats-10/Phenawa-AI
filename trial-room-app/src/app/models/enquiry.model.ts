export type EnquiryStatus = 'interested' | 'ordered';

export interface EnquirySummary {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  fabricId: string | null;
  fabricName: string | null;
  garmentType: string;
  status: EnquiryStatus;
  estimatedPrice: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnquiryDetail extends EnquirySummary {
  fabricImageBase64: string | null;
  customerHistory: EnquirySummary[];
}

export interface CustomerLookup {
  exists: boolean;
  customer: { id: string; name: string; phone: string } | null;
}

export interface PopularFabric {
  fabricId: string;
  fabricName: string;
  customers: number;
  interested: number;
  ordered: number;
}

export interface CreateEnquiryRequest {
  generationId: string;
  customerName?: string;
  customerPhone: string;
  status: EnquiryStatus;
  estimatedPrice?: number | null;
  notes?: string;
}
