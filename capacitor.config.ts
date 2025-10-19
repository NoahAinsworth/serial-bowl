import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7cc39a3b41aa4ff2a0c41d8e76270a1d',
  appName: 'Serial Bowl',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0e1a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0e1a',
    },
    App: {
      appUrlOpen: true,
    },
  },
};

export default config;
