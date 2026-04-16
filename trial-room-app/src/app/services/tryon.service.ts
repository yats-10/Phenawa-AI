import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  GenerateRequest,
  GenerateResponse,
} from '../models/generation.model';

@Injectable({ providedIn: 'root' })
export class TryonService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    return firstValueFrom(
      this.http.post<GenerateResponse>(
        `${this.baseUrl}/tryon/generate`,
        request,
      ),
    );
  }

  async getTotalCount(): Promise<number> {
    const res = await firstValueFrom(
      this.http.get<{ total: number }>(`${this.baseUrl}/tryon/count`),
    );
    return res.total;
  }
}
