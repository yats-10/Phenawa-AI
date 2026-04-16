import { Injectable } from '@angular/core';

const MAX_WIDTH = 1024;
const JPEG_QUALITY = 0.85;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable({ providedIn: 'root' })
export class ImageService {
  validateFileSize(file: File): void {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('Photo is too large. Please use a photo under 5MB.');
    }
  }

  async compressImage(
    source: File | string,
    maxWidth: number = MAX_WIDTH,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        // Strip the data URI prefix → return raw base64
        resolve(dataUrl.split(',')[1] ?? '');
      };
      img.onerror = () => reject(new Error('Failed to load image'));

      if (typeof source === 'string') {
        img.src = source;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = (e.target as FileReader).result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(source);
      }
    });
  }

  /**
   * Returns a data URL (with prefix) from a base64 string without prefix.
   */
  base64ToDataUrl(base64: string): string {
    if (base64.startsWith('data:')) return base64;
    return `data:image/jpeg;base64,${base64}`;
  }
}
