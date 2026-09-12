import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return useSyncExternalStore<S | C>(
    emptySubscribe,
    () => client,
    () => server,
  );
}
