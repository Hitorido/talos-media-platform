import { useMemo, useRef, useState, useEffect } from 'react';
import { Animated, Easing, PanResponder, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { DownloadItem } from '@/types/download';
import {
  deleteDownload,
  pauseDownload,
  resumeDownload,
  retryDownload,
} from '@/services/downloadService';

const PAGE_SIZE = 20;
/** Bounded saved-chapter pages; horizontal swipes never delete a download. */
export function SavedChapterPager({
  items,
  onOpen,
}: {
  items: DownloadItem[];
  onOpen: (item: DownloadItem) => void;
}) {
  const [page, setPage] = useState(0);
  const count = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, count - 1);
  const [opacity] = useState(() => new Animated.Value(1));
  const dots = useRef<ScrollView>(null);
  const [indicator] = useState(() => new Animated.Value(6));
  useEffect(() => {
    Animated.timing(indicator, {
      toValue: current * 28 + 6,
      duration: 180,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
    opacity.setValue(0.35);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
    dots.current?.scrollTo({ x: Math.max(0, current * 28 - 112), animated: true });
  }, [current, opacity, indicator]);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) < 45) return;
          setPage((current + (gesture.dx > 0 ? 1 : -1) + count) % count);
        },
      }),
    [count, current],
  );
  return (
    <View {...pan.panHandlers}>
      <Text variant="caption" tone="muted" className="my-2">
        Swipe right for next page. Use the trash button to remove a chapter.
      </Text>
      <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {items.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((item) => (
            <View
              key={item.id}
              style={{
                width: '23.5%',
                minHeight: 88,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 4,
              }}
              className="rounded-xl bg-neutral-100 dark:bg-neutral-800"
            >
              <Pressable
                onPress={() => onOpen(item)}
                accessibilityLabel={item.unitTitle || `Open chapter ${item.unitNumber}`}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 42,
                  width: '100%',
                }}
              >
                <Text variant="caption" numberOfLines={1}>
                  {item.mediaType === 'anime' ? 'Ep.' : 'Ch.'} {item.unitNumber}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1} style={{ fontSize: 10 }}>
                  {item.status === 'downloading'
                    ? `${Math.round(item.progress * 100)}%`
                    : item.status}
                </Text>
              </Pressable>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.status !== 'completed' ? (
                  <Pressable
                    style={{ minHeight: 28, justifyContent: 'center' }}
                    onPress={() =>
                      item.status === 'downloading' || item.status === 'queued'
                        ? pauseDownload(item.id)
                        : item.status === 'paused'
                          ? resumeDownload(item.id)
                          : retryDownload(item.id)
                    }
                  >
                    <Text variant="caption" tone="primary" style={{ fontSize: 10 }}>
                      {item.status === 'downloading' || item.status === 'queued'
                        ? 'Pause'
                        : item.status === 'paused'
                          ? 'Resume'
                          : 'Retry'}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => void deleteDownload(item.id)}
                  accessibilityLabel={`Delete ${item.unitTitle || item.unitNumber}`}
                  style={{ padding: 6 }}
                >
                  <Ionicons name="trash-outline" size={14} color="#a3a3a3" />
                </Pressable>
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
      <View className="mt-3 flex-row items-center justify-between">
        <Pressable
          onPress={() => setPage((current - 1 + count) % count)}
          accessibilityLabel="Previous chapter page"
          style={{ padding: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color="#818cf8" />
        </Pressable>
        <ScrollView
          ref={dots}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, maxWidth: 224 }}
        >
          <View style={{ flexDirection: 'row' }}>
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 12.5,
                left: 0,
                width: 16,
                height: 7,
                borderRadius: 4,
                backgroundColor: '#818cf8',
                transform: [{ translateX: indicator }],
                zIndex: 1,
              }}
            />
            {Array.from({ length: count }, (_, index) => (
              <Pressable
                key={index}
                onPress={() => setPage(index)}
                accessibilityLabel={`Chapter page ${index + 1}`}
                accessibilityState={{ selected: current === index }}
                style={{ width: 28, height: 32, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: '#737373',
                  }}
                />
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <Pressable
          onPress={() => setPage((current + 1) % count)}
          accessibilityLabel="Next chapter page"
          style={{ padding: 8 }}
        >
          <Ionicons name="chevron-forward" size={20} color="#818cf8" />
        </Pressable>
      </View>
      <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        {current + 1} of {count}
      </Text>
    </View>
  );
}
