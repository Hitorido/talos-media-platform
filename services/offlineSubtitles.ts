import * as FileSystem from 'expo-file-system/legacy';
import { saveTextFile } from '@/services/storageService';
import { parseSubtitleCues } from '@/services/subtitleCues';
export type SavedSubtitle = { language: string; url: string };
/** Fetches only supplied episode tracks; a missing caption never discards a downloaded video. */
export async function saveOfflineSubtitles(
  tracks: SavedSubtitle[],
  directory: string,
  signal: { isAborted: boolean },
) {
  const saved: SavedSubtitle[] = [];
  const failures: string[] = [];
  let bytes = 0;
  for (const [index, track] of tracks.entries()) {
    if (signal.isAborted) break;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      let text: string;
      try {
        const response = await fetch(track.url, { signal: controller.signal });
        if (!response.ok) throw new Error('Caption unavailable');
        text = await response.text();
        if (text.length > 2_000_000 || !parseSubtitleCues(text).length)
          throw new Error('Unsupported captions');
      } finally {
        clearTimeout(timeout);
      }
      if (signal.isAborted) break;
      const url = directory + `subtitle-${index}.vtt`;
      await saveTextFile(url, text);
      bytes += new TextEncoder().encode(text).byteLength;
      saved.push({ language: track.language, url });
    } catch {
      failures.push(track.language);
    }
  }
  return {
    tracks: saved,
    bytes,
    warning: failures.length
      ? `Some subtitles could not be saved: ${failures.join(', ')}. Retry while online to download them.`
      : undefined,
  };
}
export async function readSubtitleText(url: string, signal?: AbortSignal): Promise<string> {
  if (url.startsWith('file://')) return FileSystem.readAsStringAsync(url);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Captions unavailable (' + response.status + ').');
  return response.text();
}
