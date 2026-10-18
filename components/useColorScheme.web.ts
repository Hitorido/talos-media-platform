import { useSyncExternalStore } from 'react';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
const subscribe = () => () => {};
/** Match navigation colors to NativeWind, with stable server hydration. */
export function useColorScheme() {
  const { colorScheme } = useNativeWindColorScheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return mounted && colorScheme === 'dark' ? 'dark' : 'light';
}
