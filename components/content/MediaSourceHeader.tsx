import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import { PopPressable } from '@/components/ui/PopPressable';
import { animeDetailsHref, mangaDetailsHref, novelDetailsHref } from '@/lib/routes';
import { providerRegistry } from '@/providers';
import { unifiedSearch } from '@/services/contentService';
import { sourceWebsite } from '@/services/sourceWebsite';
import type { ContentType } from '@/types/content';
import { decodeMediaRouteId } from '@/types/provider';
import type { SearchResult } from '@/types/search';
import { languageLabel } from '@/utils/novelLanguage';
import { SourceWebsiteButton } from './SourceWebsiteButton';

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

function normalizeTitle(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function matchesKnownTitle(result: SearchResult, titles: Set<string>): boolean {
  return [result.title, ...(result.alternativeTitles ?? [])].some((c) =>
    titles.has(normalizeTitle(c)),
  );
}

type Props = {
  id: string;
  type: string;
  count: number;
  language?: string;
  /** Title of this media item — used to search for alternate sources. */
  title?: string;
  /** Alternative / synonym titles. */
  alternativeTitles?: string[];
  /** Content type for the alternate-source search. */
  mediaType?: ContentType;
};

export function MediaSourceHeader({
  id,
  type,
  count,
  language,
  title,
  alternativeTitles,
  mediaType,
}: Props) {
  const router = useRouter();
  const source = sourceWebsite(id);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchedRef = useRef(false);

  // Pre-fetch alternate sources once we have enough info (non-blocking, lazy).
  useEffect(() => {
    if (!title || !mediaType || searchedRef.current) return;
    searchedRef.current = true;
    const controller = new AbortController();
    const titlesKey = [title, ...(alternativeTitles ?? [])]
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 5);
    const knownTitles = new Set(titlesKey.map(normalizeTitle));
    const matches = new Map<string, SearchResult>();
    void (async () => {
      for (const query of titlesKey) {
        try {
          const publish = (batch: SearchResult[]) => {
            if (controller.signal.aborted) return;
            for (const r of batch) {
              if (
                r.id !== id &&
                r.providerId !== decodeMediaRouteId(id)?.providerId &&
                r.type === mediaType &&
                matchesKnownTitle(r, knownTitles)
              ) {
                matches.set(r.id, r);
              }
            }
            setResults([...matches.values()]);
          };
          const res = await unifiedSearch(query, mediaType, {
            signal: controller.signal,
            onProgress: publish,
          });
          publish(res.results);
        } catch {
          // Search errors are non-fatal — just don't populate results.
        }
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpen = () => {
    setLoading(results.length === 0 && !!title && !!mediaType && !searchedRef.current);
    setOpen(true);
  };

  const openResult = (result: SearchResult) => {
    setOpen(false);
    if (result.type === 'anime') router.push(animeDetailsHref(result.id));
    else if (result.type === 'novel') router.push(novelDetailsHref(result.id));
    else router.push(mangaDetailsHref(result.id));
  };

  const totalSources = 1 + results.length;
  const showMulti = totalSources > 1 && !!title && !!mediaType;

  return (
    <>
      <PopPressable
        onPress={showMulti ? handleOpen : undefined}
        accessibilityRole={showMulti ? 'button' : undefined}
        accessibilityLabel={showMulti ? `View all ${totalSources} sources` : undefined}
        className={`gap-3 rounded-xl border p-3 ${
          showMulti
            ? 'border-primary-400 bg-primary-50/60 active:opacity-80 dark:border-primary-600 dark:bg-primary-950/30'
            : 'border-neutral-200 dark:border-neutral-800'
        }`}
      >
        {/* Top row: type badge + source count chip */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row flex-wrap gap-2">
            <Badge label={type} variant="primary" />
            {type === 'Novel' ? (
              <Badge label={languageLabel(language)} variant="secondary" />
            ) : null}
          </View>
          {showMulti ? (
            <View className="flex-row items-center gap-1 rounded-full bg-primary-600 px-2.5 py-1">
              <Ionicons name="layers-outline" size={13} color="#fff" />
              <Text className="text-xs font-semibold text-white">{totalSources} sources</Text>
            </View>
          ) : null}
        </View>

        {/* Source name */}
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="label" className="flex-1">
            {showMulti ? `${totalSources} sources` : (source?.name ?? 'Local catalog')}
          </Text>
          {showMulti ? <Ionicons name="chevron-forward" size={16} color="#8b5cf6" /> : null}
        </View>

        {count > 0 ? (
          <Text variant="h3">
            {count}{' '}
            {type === 'Anime'
              ? 'Episodes'
              : source?.providerId === 'novelcodex'
                ? 'Public Chapters'
                : 'Chapters'}
          </Text>
        ) : (
          <Text tone="muted">No chapter/episode list available</Text>
        )}
        {source ? (
          <Text variant="caption" tone="muted">
            {source.mode}
          </Text>
        ) : null}
        <SourceWebsiteButton routeId={id} />
      </PopPressable>

      {/* Sources sheet modal */}
      {showMulti ? (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <View className="flex-1 items-center justify-end bg-black/50 px-4 pb-8">
            <View className="w-full max-w-2xl rounded-2xl bg-neutral-50 px-4 pb-6 pt-4 dark:bg-neutral-950">
              {/* Handle */}
              <View className="mb-3 items-center">
                <View className="h-1 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              </View>

              {/* Header */}
              <View className="mb-4 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text variant="h3">{totalSources} sources</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {title}
                  </Text>
                </View>
                <PopPressable
                  onPress={() => setOpen(false)}
                  className="p-2"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={22} color="#9ca3af" />
                </PopPressable>
              </View>

              <ScrollView
                contentContainerClassName="gap-2 pb-2"
                showsVerticalScrollIndicator={false}
              >
                {/* Current source — always first, with distinct teal accent */}
                <View className="overflow-hidden rounded-xl border-2 border-teal-400 bg-teal-50 dark:border-teal-600 dark:bg-teal-950/40">
                  <View className="flex-row items-center gap-2 bg-teal-400/20 px-3 py-1.5 dark:bg-teal-600/20">
                    <View className="h-2 w-2 rounded-full bg-teal-500" />
                    <Text
                      variant="caption"
                      className="font-semibold text-teal-700 dark:text-teal-300"
                    >
                      Current source
                    </Text>
                  </View>
                  <View className="gap-1 p-3">
                    <Text variant="label">{source?.name ?? 'Local catalog'}</Text>
                    {source?.mode ? (
                      <Text variant="caption" tone="muted">
                        {source.mode}
                      </Text>
                    ) : null}
                    <View className="mt-1">
                      <SourceWebsiteButton routeId={id} />
                    </View>
                  </View>
                </View>

                {/* Loading state */}
                {loading ? (
                  <View className="flex-row items-center justify-center gap-2 py-4">
                    <ActivityIndicator />
                    <Text variant="caption" tone="muted">
                      Searching other sources…
                    </Text>
                  </View>
                ) : null}

                {/* Alternate sources */}
                {results.map((result, idx) => {
                  const accent = SOURCE_ACCENT_COLORS[idx % SOURCE_ACCENT_COLORS.length];
                  const providerName =
                    providerRegistry.get(result.providerId)?.definition.name ?? result.providerId;
                  return (
                    <PopPressable
                      key={result.id}
                      onPress={() => openResult(result)}
                      className={`overflow-hidden rounded-xl border-2 ${accent.border} ${accent.bg}`}
                      accessibilityLabel={`Switch to ${providerName}`}
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

                {!loading && results.length === 0 ? (
                  <Text variant="caption" tone="muted" className="py-4 text-center">
                    No exact title matches found in other enabled sources.
                  </Text>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}
