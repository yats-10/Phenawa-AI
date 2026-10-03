export type EnquiryStatus = 'interested' | 'ordered';

export interface EnquirySummary {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  whatsappOptIn: boolean;
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
  resultBase64: string | null;
  fabricImageBase64: string | null;
  customerHistory: EnquirySummary[];
}

export interface CreateEnquiryRequest {
  generationId: string;
  customerName: string;
  customerPhone: string;
  status: EnquiryStatus;
  estimatedPrice?: number | null;
  notes?: string;
  whatsappOptIn: boolean;
  savePreview: boolean;
  resultBase64?: string;
}
