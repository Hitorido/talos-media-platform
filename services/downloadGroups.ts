import type { DownloadItem } from '@/types/download';
export type DownloadGroup = {
  key: string;
  title: string;
  coverUrl: string;
  items: DownloadItem[];
  createdAt: number;
};
/** Progress updates never affect title order; units remain in chapter/episode order. */
export function groupDownloads(items: DownloadItem[]): DownloadGroup[] {
  const groups = new Map<string, DownloadGroup>();
  for (const item of items) {
    const key = `${item.mediaType}:${item.mediaId}`;
    const group = groups.get(key);
    if (group) {
      group.items.push(item);
      group.createdAt = Math.min(group.createdAt, item.createdAt);
    } else
      groups.set(key, {
        key,
        title: item.mediaTitle,
        coverUrl: item.coverUrl,
        items: [item],
        createdAt: item.createdAt,
      });
  }
  return [...groups.values()]
    .sort((a, b) => b.createdAt - a.createdAt || a.key.localeCompare(b.key))
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.unitNumber - b.unitNumber || a.id.localeCompare(b.id)),
    }));
}
