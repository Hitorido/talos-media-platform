import type { ConfigContext, ExpoConfig } from 'expo/config';

const APP_VERSION = '0.6.5-beta';
const ANDROID_VERSION_CODE = 605;
const PRODUCTION_API_URL = 'https://talos-media-platform.onrender.com';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Talos',
  slug: 'talos-media-platform',
  version: APP_VERSION,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'talos',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.hitorido.talos',
  },
  android: {
    package: 'com.hitorido.talos',
    versionCode: ANDROID_VERSION_CODE,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#0a0a0a',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
    name: 'Talos',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#0a0a0a',
        dark: {
          image: './assets/images/splash-icon.png',
          backgroundColor: '#0a0a0a',
        },
      },
    ],
    'expo-video',
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? undefined,
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? PRODUCTION_API_URL,
  },
});
