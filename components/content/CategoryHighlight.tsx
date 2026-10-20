import { Text } from '@/components/ui';
import { apiRequest } from '@/services/api/client';
import { getMediaEpisodes, resolveAnimePlayback } from '@/services/contentService';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, View } from 'react-native';
export type BrowseItem = {
  id: string;
  title: string;
  coverUrl: string;
  genres?: string[];
  type?: string;
  sourceName?: string;
};
function Preview({ source }: { source: VideoSource }) {
  const player = useVideoPlayer(source, (p) => {
    p.muted = true;
    p.loop = true;
    p.play();
  });
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const sub = player.addListener('statusChange', (e) => {
      if (e.status === 'error') setFailed(true);
    });
    return () => sub.remove();
  }, [player]);
  return failed ? (
    <Text tone="muted">Preview unavailable</Text>
  ) : (
    <VideoView
      player={player}
      nativeControls={false}
      pointerEvents="none"
      contentFit="contain"
      style={{ width: '100%', aspectRatio: 16 / 9 }}
    />
  );
}
export function CategoryHighlight({
  items,
  category,
  onOpen,
}: {
  items: BrowseItem[];
  category: string;
  onOpen: (item: BrowseItem) => void;
}) {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const [seed] = useState(() => Math.random());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [preview, setPreview] = useState<{
    id: string;
    source?: VideoSource;
    error?: string;
  } | null>(null);
  const highlights = useMemo(() => {
    const unique = [...new Map(items.map((entry) => [entry.id, entry])).values()];
    const start = Math.floor(seed * unique.length);
    return [...unique.slice(start), ...unique.slice(0, start)].slice(0, 10);
  }, [items, seed]);
  const count = highlights.length;
  const item = highlights[currentIndex];
  const [indicator] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));
  const swiped = useRef(false);
  useEffect(() => {
    const animation = Animated.spring(indicator, {
      toValue: currentIndex * 26,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    });
    animation.start();
    return () => animation.stop();
  }, [currentIndex, indicator]);
  const pan = useMemo(
    () =>
      // PanResponder registers callbacks; ref access occurs only during gestures.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderGrant: () => {
          swiped.current = true;
        },
        onPanResponderMove: (_, g) => {
          const dx = g.dx;
          drag.setValue(dx);
          const sensitivity = 100;
          if (dx > sensitivity) {
            setCurrentIndex((prev) => (prev + 1) % count);
            drag.setValue(0);
          } else if (dx < -sensitivity) {
            setCurrentIndex((prev) => (prev - 1 + count) % count);
            drag.setValue(0);
          }
        },
        onPanResponderRelease: () => {
          Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () =>
          Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [drag, count],
  );
  const video = ['anime', 'movies', 'tv'].includes(category);
  useEffect(() => {
    if (video || !focused || count < 2) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % count);
    }, 6500);
    return () => clearInterval(timer);
  }, [video, focused, count]);
  useEffect(() => {
    if (!video || !item || !focused) return;
    let active = true;
    const controller = new AbortController();
    const load = async (): Promise<VideoSource> => {
      if (category === 'anime') {
        const episodes = await getMediaEpisodes(item.id);
        if (!episodes[0]) throw new Error();
        const result = await resolveAnimePlayback(item.id, episodes[0].id);
        if (result.source.isDemo) throw new Error();
        return { uri: result.source.url, contentType: result.source.contentType };
      }
      const data = await apiRequest<{
        streams: {
          url: string;
          headers?: Record<string, string>;
          contentType: 'hls' | 'progressive';
        }[];
      }>(
        `/api/playback/${category === 'tv' ? 'tv' : 'movie'}/${item.id}${category === 'tv' ? '?season=1&episode=1' : ''}`,
        { signal: controller.signal },
      );
      if (!data.streams[0]) throw new Error();
      const s = data.streams[0];
      return { uri: s.url, headers: s.headers, contentType: s.contentType };
    };
    load()
      .then((source) => {
        if (active) setPreview({ id: item.id, source });
      })
      .catch(() => {
        if (active)
          setPreview({
            id: item.id,
            error: 'Preview unavailable. Open the title to choose a source.',
          });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [item, video, category, focused]);
  if (!item) return null;
  return (
    <View
      className="gap-3 rounded-2xl overflow-hidden"
      style={{ height: 320 }}
    >
      <Animated.View {...pan.panHandlers} style={{ flex: 1, transform: [{ translateX: drag }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}
          onPressIn={() => {
            swiped.current = false;
          }}
          onPress={() => {
            if (!swiped.current) onOpen(item);
          }}
          style={{ flex: 1 }}
        >
          {item.coverUrl ? (
            <Image
              source={{ uri: item.coverUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: '#737373' }} />
          )}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              padding: 16,
              justifyContent: 'flex-end',
            }}
          >
            <Text variant="h3" style={{ color: '#fff', marginBottom: 8 }}>
              Featured {video ? 'preview' : 'spotlight'}
            </Text>
            {video && focused && preview?.id === item.id && preview.source ? (
              <Preview key={item.id} source={preview.source} />
            ) : null}
            <Text variant="h2" style={{ color: '#fff' }}>
              {item.title}
            </Text>
            {video && preview?.id === item.id && preview.error ? (
              <Text tone="muted">{preview.error}</Text>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
      <View
        style={{
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          flexDirection: 'row',
          height: 32,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 9,
            top: 12,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#818cf8',
            zIndex: 1,
            transform: [{ translateX: indicator }],
          }}
        />
        {highlights.map((entry, index) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityLabel={`Highlight ${index + 1}: ${entry.title}`}
            accessibilityState={{ selected: currentIndex === index }}
            onPress={() => setCurrentIndex(index)}
            style={{ width: 26, height: 32, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#737373' }} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
