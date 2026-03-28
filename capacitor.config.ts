import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // NOTE: Package/bundle id must be unique for store publication.
  // Change this to your own reverse-domain identifier if needed.
  appId: 'ru.slavictales.bylina',
  appName: 'Былина',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    backgroundColor: '#000000',
    scrollEnabled: false,
    bundleId: 'ru.slavictales.bylina',
    deploy: 'development',
    scheme: 'app'
  },
  android: {
    backgroundColor: '#000000',
    allowMixedContent: true,
    captureInput: true,
    forceDarkMode: false,
    buildOptions: {
      keystorePath: '',
      keystorePassword: '',
      keystoreAlias: '',
      keystoreAliasPassword: ''
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: true
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#000000',
      translucent: true
    }
  }
};

export default config;
