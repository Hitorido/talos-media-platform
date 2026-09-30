import { Text } from '@/components/ui';
import { openDownload, type VersionManifest } from '@/services/updateService';
import { Modal, Pressable, View } from 'react-native';

type Props = {
  manifest: VersionManifest;
  onDismiss: () => void;
};

/**
 * Clean update notification modal consistent with Talos visual style.
 * Download opens the official release URL in the browser — never auto-installs.
 */
export function UpdateModal({ manifest, onDismiss }: Props) {
  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={manifest.mandatory ? undefined : onDismiss}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <View className="w-full max-w-sm gap-4 rounded-2xl border border-neutral-700 bg-neutral-950 p-6 shadow-2xl">
          <Text variant="h2" className="text-white">
            {manifest.title ?? 'New version available'}
          </Text>
          <Text className="text-neutral-300">Talos v{manifest.latestVersion} is available.</Text>
          {manifest.message ? (
            <Text variant="caption" className="text-neutral-400">
              {manifest.message}
            </Text>
          ) : null}
          <View className="flex-row gap-3 pt-2">
            <Pressable
              accessibilityRole="button"
              onPress={() => openDownload(manifest.downloadUrl)}
              className="flex-1 items-center rounded-xl bg-primary-600 px-4 py-3"
            >
              <Text className="font-semibold text-white">Download</Text>
            </Pressable>
            {!manifest.mandatory ? (
              <Pressable
                accessibilityRole="button"
                onPress={onDismiss}
                className="flex-1 items-center rounded-xl border border-neutral-600 bg-neutral-900 px-4 py-3"
              >
                <Text className="text-neutral-300">Later</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
