import type { ConfigContext, ExpoConfig } from 'expo/config';

const APP_VERSION = '0.6.7-beta';
const ANDROID_VERSION_CODE = 606;
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
    './plugins/withDownloadService',
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
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Talos to use a photo as a title cover.',
        microphonePermission: false,
      },
    ],
    'expo-secure-store',
    ['expo-local-authentication', { faceIDPermission: 'Unlock your private Talos collection.' }],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: '13f724ec-d641-44fc-a71a-9b4715c1b755',
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? PRODUCTION_API_URL,
  },
});
