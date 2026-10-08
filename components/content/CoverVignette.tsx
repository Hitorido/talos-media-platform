import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { coverSampleColor } from '@/services/coverSample';
const cache = new Map<string, string>();
/** Sample a tiny decoded cover; failed/CORS-blocked artwork gets a neutral fallback. */
export function CoverVignette({ uri }: { uri?: string }) {
  const [palette, setPalette] = useState<{ uri?: string; color: string }>({ color: '#171717' });
  useEffect(() => {
    let current = true;
    if (!uri) return;
    const saved = cache.get(uri);
    if (saved) return;
    void (async () => {
      let file: string | undefined;
      let context: ReturnType<typeof ImageManipulator.manipulate> | undefined;
      let rendered:
        | Awaited<ReturnType<ReturnType<typeof ImageManipulator.manipulate>['renderAsync']>>
        | undefined;
      try {
        context = ImageManipulator.manipulate(uri);
        context.resize({ width: 24, height: 24 });
        rendered = await context.renderAsync();
        const output = await rendered.saveAsync({
          format: SaveFormat.JPEG,
          compress: 1,
          base64: true,
        });
        file = output.uri;
        if (!output.base64) return;
        const color = coverSampleColor(
          Uint8Array.from(atob(output.base64), (c) => c.charCodeAt(0)),
        );
        if (cache.size >= 100) cache.delete(cache.keys().next().value!);
        cache.set(uri, color);
        if (current) setPalette({ uri, color });
      } catch {
        /* Palette is decorative; artwork remains usable without it. */
      } finally {
        rendered?.release();
        context?.release();
        if (file?.startsWith('file:'))
          await FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {});
      }
    })();
    return () => {
      current = false;
    };
  }, [uri]);
  const color =
    (uri ? cache.get(uri) : undefined) ?? (palette.uri === uri ? palette.color : '#171717');
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[color + '22', color + '00', color + 'EE']}
      locations={[0, 0.35, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}
