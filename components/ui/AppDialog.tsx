import { Modal, View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';
import { closeAppDialog, useDialogStore } from '@/stores/dialogStore';

export function AppDialog() {
  const dialog = useDialogStore((s) => s.dialogs[0]);
  if (!dialog) return null;
  const cancel = () => {
    closeAppDialog();
    dialog.buttons.find((button) => button.style === 'cancel')?.onPress?.();
  };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={cancel}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View
          accessibilityViewIsModal
          className="w-full max-w-lg gap-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <Text variant="h3">{dialog.title}</Text>
          {dialog.message ? <Text tone="muted">{dialog.message}</Text> : null}
          <View className="flex-row flex-wrap justify-end gap-2">
            {dialog.buttons.map((button, index) => (
              <Button
                key={index}
                label={button.text || 'OK'}
                size="sm"
                variant={
                  button.style === 'destructive'
                    ? 'destructive'
                    : button.style === 'cancel'
                      ? 'secondary'
                      : 'primary'
                }
                onPress={() => {
                  closeAppDialog();
                  button.onPress?.();
                }}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
