import { CapacitorConfig } from '@capacitor/cli';

const localAndroidBuild = process.env['PHENAWA_ANDROID_LOCAL'] === '1';

const config: CapacitorConfig = {
  appId: 'ai.phenawa.app',
  appName: 'Phenawa AI',
  webDir: 'www/browser',
  android: {
    allowMixedContent: localAndroidBuild,
  },
  server: {
    androidScheme: 'https',
    cleartext: localAndroidBuild,
  },
};

export default config;
