import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7cc39a3b41aa4ff2a0c41d8e76270a1d',
  appName: 'serial-bowl',
  webDir: 'dist',
  server: {
    url: 'https://7cc39a3b-41aa-4ff2-a0c4-1d8e76270a1d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'always'
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
