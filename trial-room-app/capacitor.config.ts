import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.phenawa.app',
  appName: 'Phenawa AI',
  webDir: 'www',
  plugins: {
    Camera: {
      permissions: {
        ios: ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription'],
        android: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE'],
      },
    },
  },
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;

