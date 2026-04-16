import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

export const AdminGuard: CanActivateFn = async () => {
  const storageService = inject(StorageService);
  const router = inject(Router);

  const token = await storageService.getAdminToken();
  if (!token || !storageService.isTokenValid(token)) {
    await storageService.clearAdminToken();
    await router.navigate(['/admin/login'], { replaceUrl: true });
    return false;
  }

  return true;
};
