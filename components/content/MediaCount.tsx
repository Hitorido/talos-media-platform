import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui';
import { getEnglishChapterCount } from '@/services/englishChapterCount';
import type { ContentType } from '@/types/content';

/** Counts load independently of the first search/discovery cards; never fetch chapter content. */
export function MediaCount({
  compact = false,
  routeId,
  type,
  episodeCount,
  chapterCount,
}: {
  compact?: boolean;
  routeId: string;
  type: ContentType;
  episodeCount?: number;
  chapterCount?: number;
}) {
  const [result, setResult] = useState<{ id: string; count?: number; failed?: boolean }>({
    id: routeId,
  });
  useEffect(() => {
    if (type === 'anime' || (type === 'novel' && chapterCount !== undefined)) return;
    let current = true;
    const controller = new AbortController();
    // Avoid starting jobs for cards immediately discarded by typing/navigation.
    const timer = setTimeout(() => {
      getEnglishChapterCount(routeId, controller.signal).then(
        (count) => {
          if (current) setResult({ id: routeId, count });
        },
        () => {
          if (current) setResult({ id: routeId, failed: true });
        },
      );
    }, 250);
    return () => {
      current = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [routeId, type, chapterCount]);
  if (type === 'anime')
    return (
      <Badge
        compact={compact}
        variant="primary"
        label={episodeCount ? episodeCount + ' episodes' : 'Episodes unknown'}
      />
    );
  const count =
    type === 'novel' && chapterCount !== undefined
      ? chapterCount
      : result.id === routeId
        ? result.count
        : undefined;
  return (
    <Badge
      compact={compact}
      variant="primary"
      label={
        count !== undefined
          ? count + ' EN ch.' + (type === 'novel' && chapterCount !== undefined ? ' (catalog)' : '')
          : result.id === routeId && result.failed
            ? 'Count unavailable'
            : 'Counting EN chapters?'
      }
    />
  );
}
