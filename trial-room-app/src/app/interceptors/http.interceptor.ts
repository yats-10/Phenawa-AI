import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { ToastController } from '@ionic/angular/standalone';
import { StorageService } from '../services/storage.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const storageService = inject(StorageService);
  const router = inject(Router);
  const toastCtrl = inject(ToastController);

  const isAdminRoute = req.url.includes('/admin/');

  return from(
    isAdminRoute
      ? storageService.getAdminToken()
      : storageService.getToken(),
  ).pipe(
    switchMap((token) => {
      let clonedReq = req;
      if (token) {
        clonedReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      return next(clonedReq);
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          void (async () => {
            if (isAdminRoute) {
              await storageService.clearAdminToken();
              await router.navigate(['/admin/login'], { replaceUrl: true });
            } else {
              await storageService.clearToken();
              await router.navigate(['/login'], { replaceUrl: true });
            }
          })();
        } else if (error.status === 403) {
          const message =
            error.error?.message ??
            'Access denied. Please contact the administrator.';
          void toastCtrl
            .create({
              message,
              duration: 5000,
              color: 'danger',
              position: 'top',
            })
            .then((toast) => toast.present());
        }
      }
      return throwError(() => error);
    }),
  );
};
