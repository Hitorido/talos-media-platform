import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useAppTheme } from '@/providers/ThemeProvider';
import {
  downloadAnimeEpisode,
  downloadMangaChapter,
  downloadNovelChapter,
} from '@/services/downloadService';
import { useDownloadStore } from '@/stores/downloadStore';
import type { AnimeDetails, AnimeEpisode } from '@/types/anime';
import type { MangaChapter, MangaDetails } from '@/types/manga';
import type { NovelChapter, NovelDetails } from '@/types/novel';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BulkDownloadTarget =
  | { kind: 'anime'; anime: AnimeDetails; episodes: AnimeEpisode[]; watchedIds?: Set<string> }
  | { kind: 'manga'; manga: MangaDetails; chapters: MangaChapter[]; readIds?: Set<string> }
  | { kind: 'novel'; novel: NovelDetails; chapters: NovelChapter[]; readIds?: Set<string> };

export type BulkDownloadModalProps = {
  visible: boolean;
  target: BulkDownloadTarget | null;
  onClose: () => void;
};

type PickerOption = { label: string; value: number };

function DropdownSeparator({ color }: { color: string }) {
  return <View style={[styles.separator, { backgroundColor: color }]} />;
}

type NumberPickerProps = {
  label: string;
  options: PickerOption[];
  selectedValue: number;
  onSelect: (value: number) => void;
  colors: {
    foreground: string;
    mutedForeground: string;
    card: string;
    border: string;
    primary: string;
    muted: string;
  };
};

function NumberPicker({ label, options, selectedValue, onSelect, colors }: NumberPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    options.find((option) => option.value === selectedValue)?.label ?? `#${selectedValue}`;

  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: 11,
          color: colors.mutedForeground,
          marginBottom: 6,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.pickerButton,
          {
            borderColor: colors.border,
            backgroundColor: colors.muted,
          },
        ]}
      >
        <Text style={{ fontSize: 14, color: colors.foreground, flex: 1 }} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.dropdownContainer}>
          <Pressable style={styles.dropdownOverlay} onPress={() => setOpen(false)} />
          <View style={[styles.dropdownSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.dropdownHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.dropdownTitle, { color: colors.foreground }]}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              style={{ maxHeight: 320 }}
              ItemSeparatorComponent={() => <DropdownSeparator color={colors.border} />}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item.value);
                      setOpen(false);
                    }}
                    style={[
                      styles.dropdownItem,
                      isSelected && { backgroundColor: colors.muted, borderRadius: 8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        { color: colors.foreground },
                        isSelected && { color: colors.primary, fontWeight: '600' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

function getTargetKey(target: BulkDownloadTarget): string {
  if (target.kind === 'anime') return `anime:${target.anime.id}`;
  if (target.kind === 'manga') return `manga:${target.manga.id}`;
  return `novel:${target.novel.id}`;
}

type BulkDownloadSheetProps = {
  target: BulkDownloadTarget;
  onClose: () => void;
  colors: ReturnType<typeof useAppTheme>['theme']['colors'];
};

function BulkDownloadSheet({ target, onClose, colors }: BulkDownloadSheetProps) {
  const isDownloaded = useDownloadStore((s) => s.isDownloaded);

  const totalUnits = useMemo(() => {
    if (target.kind === 'anime') return target.episodes.length;
    return target.chapters.length;
  }, [target]);

  const firstUnitNumber = useMemo(() => {
    if (target.kind === 'anime') return target.episodes[0]?.number ?? 1;
    return target.chapters[0]?.number ?? 1;
  }, [target]);

  const lastUnitNumber = useMemo(() => {
    if (target.kind === 'anime') {
      return target.episodes[target.episodes.length - 1]?.number ?? 1;
    }
    return target.chapters[target.chapters.length - 1]?.number ?? 1;
  }, [target]);

  const [startValue, setStartValue] = useState(firstUnitNumber);
  const [endValue, setEndValue] = useState(lastUnitNumber);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [queued, setQueued] = useState<number | null>(null);
  const isStarting = useRef(false);

  const pickerOptions: PickerOption[] = useMemo(() => {
    if (!target) return [];
    if (target.kind === 'anime') {
      return target.episodes.map((ep) => ({
        label: `Episode ${ep.number}`,
        value: ep.number,
      }));
    }
    const chapters = target.chapters;
    return chapters.map((ch) => ({
      label: `Chapter ${ch.number}`,
      value: ch.number,
    }));
  }, [target]);

  const unitsLabel = useMemo(() => {
    if (target.kind === 'anime') return 'episodes';
    return 'chapters';
  }, [target]);

  const clampedStart = Math.min(startValue, endValue);
  const clampedEnd = Math.max(startValue, endValue);

  const selectedUnits = useMemo(() => {
    if (target.kind === 'anime') {
      return target.episodes.filter((ep) => ep.number >= clampedStart && ep.number <= clampedEnd);
    }
    return target.chapters.filter((ch) => ch.number >= clampedStart && ch.number <= clampedEnd);
  }, [target, clampedStart, clampedEnd]);

  const filteredUnits = useMemo(() => {
    if (!unreadOnly) return selectedUnits;

    if (target.kind === 'anime') {
      const watched = target.watchedIds ?? new Set<string>();
      return (selectedUnits as AnimeEpisode[]).filter(
        (ep) => !watched.has(ep.id) && !isDownloaded(target.anime.id, ep.id),
      );
    }
    const readSet = target.readIds ?? new Set<string>();
    return (selectedUnits as MangaChapter[] | NovelChapter[]).filter(
      (ch: MangaChapter | NovelChapter) => {
        const mediaId = target.kind === 'manga' ? target.manga.id : target.novel.id;
        return !readSet.has(ch.id) && !isDownloaded(mediaId, ch.id);
      },
    );
  }, [target, selectedUnits, unreadOnly, isDownloaded]);

  const handleStart = useCallback(() => {
    if (isStarting.current || filteredUnits.length === 0) return;
    isStarting.current = true;

    let count = 0;
    try {
      if (target.kind === 'anime') {
        for (const ep of filteredUnits as AnimeEpisode[]) {
          downloadAnimeEpisode(target.anime, ep);
          count++;
        }
      } else if (target.kind === 'manga') {
        for (const ch of filteredUnits as MangaChapter[]) {
          downloadMangaChapter(target.manga, ch);
          count++;
        }
      } else {
        for (const ch of filteredUnits as NovelChapter[]) {
          downloadNovelChapter(target.novel, ch);
          count++;
        }
      }
      setQueued(count);
    } catch {
      Alert.alert('Error', 'Failed to queue some downloads. Please try again.');
    } finally {
      isStarting.current = false;
    }
  }, [target, filteredUnits]);

  const mediaTitle =
    target.kind === 'anime'
      ? target.anime.title
      : target.kind === 'manga'
        ? target.manga.title
        : target.novel.title;

  const mediaVariant =
    target.kind === 'anime' ? 'anime' : target.kind === 'novel' ? 'novel' : 'manga';

  return (
    <View style={[styles.sheet, { backgroundColor: colors.card }]}>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      <View style={styles.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}
            numberOfLines={1}
          >
            {mediaTitle}
          </Text>
          <Badge label={target.kind.toUpperCase()} variant={mediaVariant} />
        </View>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Download Range</Text>
        <View style={styles.rangeRow}>
          <NumberPicker
            label={`Start ${target.kind === 'anime' ? 'Episode' : 'Chapter'}`}
            options={pickerOptions}
            selectedValue={startValue}
            colors={colors}
            onSelect={(value) => {
              setStartValue(value);
              if (value > endValue) setEndValue(value);
            }}
          />
          <Ionicons
            name="arrow-forward"
            size={18}
            color={colors.mutedForeground}
            style={{ marginBottom: 4, alignSelf: 'flex-end' }}
          />
          <NumberPicker
            label={`End ${target.kind === 'anime' ? 'Episode' : 'Chapter'}`}
            options={pickerOptions}
            selectedValue={endValue}
            colors={colors}
            onSelect={(value) => {
              setEndValue(value);
              if (value < startValue) setStartValue(value);
            }}
          />
        </View>

        <Pressable
          onPress={() => setUnreadOnly((value) => !value)}
          style={[styles.toggleRow, { borderColor: colors.border }]}
        >
          <View
            style={[
              styles.checkbox,
              unreadOnly
                ? { borderColor: colors.primary, backgroundColor: colors.primary }
                : { borderColor: colors.border, backgroundColor: 'transparent' },
            ]}
          >
            {unreadOnly ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleTitle, { color: colors.foreground }]}>
              {target.kind === 'anime' ? 'Unwatched episodes only' : 'Unread chapters only'}
            </Text>
            <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
              Skip already {target.kind === 'anime' ? 'watched or' : 'read or'} downloaded{' '}
              {unitsLabel}
            </Text>
          </View>
        </Pressable>

        <View style={[styles.summary, { backgroundColor: colors.muted }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Total {unitsLabel}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{totalUnits}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Selected range
            </Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {selectedUnits.length}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Will be queued
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: filteredUnits.length > 0 ? colors.primary : colors.foreground },
              ]}
            >
              {filteredUnits.length}
            </Text>
          </View>
        </View>

        {queued !== null ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <Text style={styles.successText}>
              {queued} {unitsLabel} queued for download!
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 10, marginTop: 4 }}>
          {queued === null ? (
            <Button
              label={
                filteredUnits.length === 0
                  ? 'Nothing to download'
                  : `Queue ${filteredUnits.length} ${unitsLabel}`
              }
              variant="primary"
              onPress={handleStart}
              disabled={filteredUnits.length === 0}
            />
          ) : (
            <Button
              label="Queue More"
              variant="secondary"
              onPress={() => {
                setQueued(null);
                setStartValue(firstUnitNumber);
                setEndValue(lastUnitNumber);
                setUnreadOnly(false);
              }}
            />
          )}
          <Button label="Close" variant="ghost" onPress={onClose} />
        </View>
      </ScrollView>
    </View>
  );
}

export function BulkDownloadModal({ visible, target, onClose }: BulkDownloadModalProps) {
  const { theme } = useAppTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      {target ? (
        <BulkDownloadSheet
          key={getTargetKey(target)}
          target={target}
          colors={theme.colors}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
    maxHeight: '85%',
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  dropdownContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dropdownOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dropdownSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 12,
  },
  dropdownHandle: {
    width: 40,
    height: 4,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: 12,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  separator: {
    height: 1,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 8,
  },
  dropdownItemText: {
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleSub: {
    fontSize: 12,
    marginTop: 2,
  },
  summary: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  successText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '500',
  },
});
