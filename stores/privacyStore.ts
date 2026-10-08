import { appAlert as Alert } from '@/stores/dialogStore';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform, AppState } from 'react-native';
import * as Authentication from 'expo-local-authentication';
import { appPersistStorage } from './persistStorage';

type PrivacyState = {
  incognito: boolean;
  configured: boolean;
  unlocked: boolean;
  setIncognito: (value: boolean) => void;
  lock: () => void;
};
/** Unlock state is session-only. The OS owns the credential; Talos stores no password. */
let generation = 0;
export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      incognito: false,
      configured: false,
      unlocked: false,
      setIncognito: (incognito) => set({ incognito }),
      lock: () => {
        generation++;
        set({ unlocked: false });
      },
    }),
    {
      name: 'privacy-settings',
      storage: createJSONStorage(() => appPersistStorage),
      partialize: (s) => ({ configured: s.configured }),
    },
  ),
);
let pending: Promise<boolean> | undefined;
/** Credential prompts can background the app; hide content without cancelling that prompt. */
export function relockPrivateOnBackground() {
  if (pending) usePrivacyStore.setState({ unlocked: false });
  else usePrivacyStore.getState().lock();
}
async function waitForForeground(): Promise<boolean> {
  if (AppState.currentState === 'active') return true;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      subscription.remove();
      resolve(false);
    }, 1500);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        clearTimeout(timer);
        subscription.remove();
        resolve(true);
      }
    });
  });
}
export function unlockPrivate(setup = false): Promise<boolean> {
  if (pending) return pending;
  const attempt = generation;
  pending = (async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Device authentication required',
        'Private collection access is available in the Android/iOS app.',
      );
      return false;
    }
    if (!setup && !usePrivacyStore.getState().configured) {
      Alert.alert(
        'Set up Private first',
        'Open Settings > Privacy and configure your device lock.',
      );
      return false;
    }
    try {
      const level = await Authentication.getEnrolledLevelAsync();
      if (level === Authentication.SecurityLevel.NONE) {
        Alert.alert(
          'Set a device lock',
          'Configure a phone passcode or fingerprint in your device settings, then return here.',
        );
        return false;
      }
      const result = await Authentication.authenticateAsync({
        promptMessage: setup ? 'Set up Talos Private' : 'Unlock Talos Private',
        disableDeviceFallback: false,
        biometricsSecurityLevel: 'strong',
      });
      if (!result.success || !(await waitForForeground()) || generation !== attempt) return false;
      usePrivacyStore.setState({ configured: true, unlocked: true });
      return true;
    } catch {
      Alert.alert(
        'Unable to authenticate',
        'Device authentication is unavailable. Private remains locked.',
      );
      return false;
    }
  })().finally(() => {
    pending = undefined;
  });
  return pending;
}
