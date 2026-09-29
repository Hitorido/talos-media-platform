import { captureRef, releaseCapture } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, type View } from 'react-native';
import type { RefObject } from 'react';

/** Capture only the reading viewport and keep the preview in app storage. */
export async function captureBookmarkPreview(
  view: RefObject<View | null>,
): Promise<string | undefined> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory || !view.current) return;
  const temporary = await captureRef(view, {
    format: 'jpg',
    quality: 0.7,
    result: 'tmpfile',
    width: 600,
  });
  const directory = FileSystem.documentDirectory + 'bookmark-previews/';
  try {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const uri = directory + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
    await FileSystem.copyAsync({ from: temporary, to: uri });
    return uri;
  } finally {
    releaseCapture(temporary);
  }
}

export async function removeBookmarkPreview(uri?: string): Promise<void> {
  const root = FileSystem.documentDirectory && FileSystem.documentDirectory + 'bookmark-previews/';
  if (root && uri?.startsWith(root) && /^[0-9]+-[a-z0-9]+\.jpg$/.test(uri.slice(root.length))) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
