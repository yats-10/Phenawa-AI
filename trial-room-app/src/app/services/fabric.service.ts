import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Fabric, CreateFabricRequest } from '../models/fabric.model';

@Injectable({ providedIn: 'root' })
export class FabricService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  async getAll(): Promise<Fabric[]> {
    return firstValueFrom(
      this.http.get<Fabric[]>(`${this.baseUrl}/fabrics`),
    );
  }

  async create(request: CreateFabricRequest): Promise<Fabric> {
    return firstValueFrom(
      this.http.post<Fabric>(`${this.baseUrl}/fabrics`, request),
    );
  }

  async rename(id: string, name: string): Promise<Fabric> {
    return firstValueFrom(
      this.http.patch<Fabric>(`${this.baseUrl}/fabrics/${id}`, { name }),
    );
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.baseUrl}/fabrics/${id}`),
    );
  }
}
