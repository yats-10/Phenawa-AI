export interface Generation {
  id: string;
  userId: string;
  fabricId: string | null;
  garmentType: string;
  resultBase64: string | null;
  createdAt: string;
}

export interface GenerateRequest {
  personImageBase64: string;
  fabricImageBase64?: string;
  fabricId?: string;
  garmentType: string;
}

export interface GenerateResponse {
  resultBase64: string;
  cached: boolean;
}

