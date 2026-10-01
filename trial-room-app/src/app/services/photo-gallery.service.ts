import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface PhotoGalleryPlugin {
  savePhoto(options: { base64: string }): Promise<{ uri: string }>;
}

const PhotoGallery = registerPlugin<PhotoGalleryPlugin>('PhotoGallery');

@Injectable({ providedIn: 'root' })
export class PhotoGalleryService {
  async save(base64: string): Promise<'gallery' | 'download'> {
    if (Capacitor.getPlatform() === 'android') {
      await PhotoGallery.savePhoto({ base64 });
      return 'gallery';
    }

    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${base64}`;
    link.download = `phenawa-try-on-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return 'download';
  }
}
