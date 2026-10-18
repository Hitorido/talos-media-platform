import type { ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

/** Keep metadata beside the chapter list on desktop, stacked on phones. */
export function DetailsColumns({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= 1024;
  return (
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 28, alignItems: 'stretch' }}>
      <View style={{ width: wide ? '40%' : '100%', minWidth: 0, gap: 20 }}>{summary}</View>
      <View style={{ flex: wide ? 1 : undefined, minWidth: 0, gap: 16 }}>{children}</View>
    </View>
  );
}
