import { create } from 'zustand';
import type { AlertButton } from 'react-native';

type Dialog = { title: string; message?: string; buttons: AlertButton[] };
export const useDialogStore = create<{ dialogs: Dialog[] }>(() => ({ dialogs: [] }));
/** App-owned messages share the theme; credential and permission prompts remain OS-owned. */
export const appAlert = {
  alert(title: string, message?: string, buttons: AlertButton[] = [{ text: 'OK' }]) {
    useDialogStore.setState((s) => ({ dialogs: [...s.dialogs, { title, message, buttons }] }));
  },
};
export function closeAppDialog() {
  useDialogStore.setState((s) => ({ dialogs: s.dialogs.slice(1) }));
}
