import { useDialogEscape } from '@/hooks/useDialogEscape';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, View } from 'react-native';

import { PopPressable, Text } from '@/components/ui';
import { animeDetailsHref, mangaDetailsHref, novelDetailsHref } from '@/lib/routes';
import { providerRegistry } from '@/providers';
import { unifiedSearch } from '@/services/contentService';
import type { ContentType } from '@/types/content';
import { decodeMediaRouteId } from '@/types/provider';
import type { SearchResult } from '@/types/search';

/** Accent palette — each alternate source gets a distinct colour stripe. */
const SOURCE_ACCENT_COLORS = [
  {
    border: 'border-violet-400 dark:border-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    dot: '#7c3aed',
  },
  {
    border: 'border-sky-400 dark:border-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    dot: '#0284c7',
  },
  {
    border: 'border-emerald-400 dark:border-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    dot: '#059669',
  },
  {
    border: 'border-rose-400 dark:border-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    dot: '#e11d48',
  },
  {
    border: 'border-amber-400 dark:border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    dot: '#d97706',
  },
  {
    border: 'border-fuchsia-400 dark:border-fuchsia-500',
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
    dot: '#a21caf',
  },
];

/** Get consistent color index for a provider based on its ID */
function getProviderColorIndex(providerId: string): number {
  let hash = 0;
  for (let i = 0; i < providerId.length; i++) {
    hash = ((hash << 5) - hash) + providerId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % SOURCE_ACCENT_COLORS.length;
}

type AlternateSourcesModalProps = {
  visible: boolean;
  title: string;
  alternativeTitles?: string[];
  mediaType: ContentType;
  currentMediaId: string;
  onClose: () => void;
};

function normalizeTitle(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function matchesKnownTitle(result: SearchResult, titles: Set<string>): boolean {
  return [result.title, ...(result.alternativeTitles ?? [])].some((candidate) =>
    titles.has(normalizeTitle(candidate)),
  );
}

export function AlternateSourcesModal({
  visible,
  title,
  alternativeTitles = [],
  mediaType,
  currentMediaId,
  onClose,
}: AlternateSourcesModalProps) {
  useDialogEscape(visible, onClose);
  const router = useRouter();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Null until the current session's search finishes (success or failure);
  // `loading` is derived from it so the effect never writes state synchronously.
  const [completedKey, setCompletedKey] = useState<string | null>(null);

  // A primitive effect key: an unstable alternativeTitles array (e.g. an
  // inline [] default) must not abort and restart an in-flight search on every
  // re-render — only an actual change to the titles may re-run it.
  const titlesKey = [
    ...new Set([title, ...(alternativeTitles ?? [])].map((value) => value.trim()).filter(Boolean)),
  ]
    .slice(0, 5)
    .join('\n');
  const sessionKey = `${currentMediaId}|${mediaType}|${titlesKey}`;
  const loading = visible && completedKey !== sessionKey;

  useEffect(() => {
    if (!visible) return;
    const titles = titlesKey.split('\n');
    const controller = new AbortController();
    const knownTitles = new Set(titles.map(normalizeTitle));
    setResults([]);
    setError(null);
    setCompletedKey(null);
    void (async () => {
      const matches = new Map<string, SearchResult>();
      try {
        for (const query of titles) {
          const publish = (batch: SearchResult[]) => {
            if (controller.signal.aborted) return;
            for (const result of batch) {
              if (
                result.id !== currentMediaId &&
                result.providerId !== decodeMediaRouteId(currentMediaId)?.providerId &&
                result.type === mediaType &&
                matchesKnownTitle(result, knownTitles)
              )
                matches.set(result.id, result);
            }
            setResults([...matches.values()]);
          };
          const response = await unifiedSearch(query, mediaType, {
            signal: controller.signal,
            onProgress: publish,
          });
          publish(response.results);
        }
        if (!controller.signal.aborted) setError(null);
      } catch (searchError) {
        if (!controller.signal.aborted) {
          setError(
            searchError instanceof Error ? searchError.message : 'Could not search other sources.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setCompletedKey(sessionKey);
      }
    })();

    return () => controller.abort();
  }, [currentMediaId, mediaType, sessionKey, titlesKey, visible]);

  const openResult = (result: SearchResult) => {
    onClose();
    if (result.type === 'anime') router.replace(animeDetailsHref(result.id));
    else if (result.type === 'novel') router.replace(novelDetailsHref(result.id));
    else router.replace(mangaDetailsHref(result.id));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/45 px-4">
        <View className="max-h-[82%] w-full max-w-2xl rounded-2xl bg-neutral-50 px-4 pb-8 pt-4 dark:bg-neutral-950">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text variant="h3">Other sources</Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {title}
              </Text>
            </View>
            <PopPressable
              onPress={onClose}
              accessibilityLabel="Close other sources"
              className="p-2"
            >
              <Ionicons name="close" size={22} color="#9ca3af" />
            </PopPressable>
          </View>
          {loading ? (
            <View className="flex-row items-center justify-center gap-2 py-8">
              <ActivityIndicator />
              <Text variant="caption" tone="muted">
                Searching enabled sources…
              </Text>
            </View>
          ) : null}
          {error ? (
            <Text variant="caption" tone="destructive" className="py-5">
              {error}
            </Text>
          ) : !loading && results.length === 0 ? (
            <Text variant="caption" tone="muted" className="py-5">
              No exact title matches were found in other enabled sources.
            </Text>
          ) : (
            <ScrollView contentContainerClassName="gap-2 pb-4">
              {results.map((result) => {
                const accent = SOURCE_ACCENT_COLORS[getProviderColorIndex(result.providerId)];
                const providerName =
                  providerRegistry.get(result.providerId)?.definition.name ?? result.providerId;
                return (
                  <PopPressable
                    key={result.id}
                    onPress={() => openResult(result)}
                    className={`overflow-hidden rounded-xl border-2 ${accent.border} ${accent.bg}`}
                  >
                    <View
                      className="flex-row items-center gap-2 px-3 py-1.5"
                      style={{ backgroundColor: accent.dot + '22' }}
                    >
                      <View
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: accent.dot }}
                      />
                      <Text
                        variant="caption"
                        className="font-semibold"
                        style={{ color: accent.dot }}
                      >
                        Alternate source
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between gap-3 p-3">
                      <View className="flex-1">
                        <Text variant="label" numberOfLines={2}>
                          {result.title}
                        </Text>
                        <Text variant="caption" tone="muted">
                          {providerName}
                        </Text>
                        {result.status ? (
                          <Text variant="caption" tone="muted">
                            {result.status}
                          </Text>
                        ) : null}
                      </View>
                      <View className="items-end gap-1">
                        {result.episodeCount !== undefined ? (
                          <Text variant="caption" tone="muted">
                            {result.episodeCount} eps
                          </Text>
                        ) : null}
                        {typeof result.chapterCount === 'number' ? (
                          <Text variant="caption" tone="muted">
                            {result.chapterCount} ch
                          </Text>
                        ) : null}
                        <Ionicons
                          name="arrow-forward-circle"
                          size={22}
                          style={{ color: accent.dot }}
                        />
                      </View>
                    </View>
                  </PopPressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
