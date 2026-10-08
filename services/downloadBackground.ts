import { AppState, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { appAlert } from '@/stores/dialogStore';

let serial = Promise.resolve();
let warned = false;
let askedNotifications = false;
/** Serialize service transitions so an old queue's stop cannot stop a newly started queue. */
export function setDownloadBackgroundActive(active: boolean): Promise<void> {
  serial = serial
    .catch(() => {})
    .then(async () => {
      // Expo Go has no linked module. Its foreground queue continues to work normally.
      if (Platform.OS !== 'android' || !NativeModules.RNBackgroundActions) return;
      const service = (await import('react-native-background-actions')).default;
      if (!active) {
        if (service.isRunning()) await service.stop();
        return;
      }
      if (service.isRunning() || AppState.currentState !== 'active') return;
      try {
        if (Number(Platform.Version) >= 33 && !askedNotifications) {
          askedNotifications = true;
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        }
        if (AppState.currentState !== 'active') return;
        await service.start(() => new Promise<void>(() => {}), {
          taskName: 'TalosDownloads',
          taskTitle: 'Talos downloads',
          taskDesc: 'Saving media for offline use. Open Talos to pause or cancel.',
          taskIcon: { name: 'ic_launcher', type: 'mipmap' },
          color: '#7c3aed',
          linkingURI: 'talos://downloads',
          foregroundServiceType: ['dataSync'],
        });
      } catch {
        if (!warned) {
          warned = true;
          appAlert.alert(
            'Keep Talos open',
            'Android could not start background downloads. Downloads can continue while Talos is open.',
          );
        }
      }
    });
  return serial;
}
