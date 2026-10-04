import { useEffect } from 'react';
import { Platform } from 'react-native';

/** Keep browser dialog dismissal consistent with Android's system Back. */
export function useDialogEscape(visible: boolean, onClose: () => void) {
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const previous = document.activeElement as HTMLElement | null;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('keydown', close);
      previous?.focus?.();
    };
  }, [visible, onClose]);
}
