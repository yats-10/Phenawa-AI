import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateEnquiryRequest,
  EnquiryDetail,
  EnquiryStatus,
  EnquirySummary,
} from '../models/enquiry.model';

@Injectable({ providedIn: 'root' })
export class EnquiryService {
  private readonly baseUrl = `${environment.apiUrl}/enquiries`;

  constructor(private readonly http: HttpClient) {}

  create(request: CreateEnquiryRequest): Promise<EnquiryDetail> {
    return firstValueFrom(this.http.post<EnquiryDetail>(this.baseUrl, request));
  }

  findAll(status?: EnquiryStatus): Promise<EnquirySummary[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return firstValueFrom(this.http.get<EnquirySummary[]>(this.baseUrl, { params }));
  }

  findOne(id: string): Promise<EnquiryDetail> {
    return firstValueFrom(this.http.get<EnquiryDetail>(`${this.baseUrl}/${id}`));
  }

  update(id: string, changes: { status: EnquiryStatus }): Promise<EnquiryDetail> {
    return firstValueFrom(this.http.patch<EnquiryDetail>(`${this.baseUrl}/${id}`, changes));
  }
}
