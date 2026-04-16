import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

export const AuthGuard: CanActivateFn = async () => {
  const storageService = inject(StorageService);
  const router = inject(Router);

  const token = await storageService.getToken();
  if (!token || !storageService.isTokenValid(token)) {
    await storageService.clearToken();
    await router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  // Also check accessExpiresAt from JWT payload
  const payload = storageService.decodeToken(token);
  if (payload?.accessExpiresAt) {
    if (new Date(payload.accessExpiresAt) < new Date()) {
      await storageService.clearToken();
      await router.navigate(['/login'], { replaceUrl: true });
      return false;
    }
  }

  return true;
};
