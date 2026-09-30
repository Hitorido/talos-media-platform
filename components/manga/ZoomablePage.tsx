import type { MangaPage } from '@/types/manga';
import { useEffect, useState } from 'react';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    type SharedValue,
} from 'react-native-reanimated';
import { useReaderZoom } from './useReaderZoom';

const dimensions = new Map<string, number>();

export function FittedPage({
  page,
  width,
  height,
  paged = false,
  scale,
  x,
  onHeight,
  onWidth,
}: {
  page: MangaPage;
  width: number;
  height: number;
  paged?: boolean;
  scale: SharedValue<number>;
  x: SharedValue<number>;
  onHeight?: (height: number) => void;
  onWidth?: (width: number) => void;
}) {
  const [ratio, setRatio] = useState(dimensions.get(page.imageUrl) || page.aspectRatio || 0.67);
  const [decoded, setDecoded] = useState(
    Boolean(dimensions.get(page.imageUrl) || page.aspectRatio),
  );
  const baseWidth = paged && ratio >= 0.5 ? Math.min(width, height * ratio) : width;
  // Row is only as wide as the page so empty letterbox isn't part of the layout.
  const row = { height: baseWidth / ratio, width: baseWidth, alignSelf: 'center' as const };
  useEffect(() => {
    onWidth?.(baseWidth);
    if (decoded) onHeight?.(baseWidth / ratio);
  }, [baseWidth, ratio, onHeight, onWidth, decoded]);
  const image = useAnimatedStyle(() => ({
    width: baseWidth,
    height: baseWidth / ratio,
  }));
  return (
    <Animated.View style={row}>
      <Animated.View style={image}>
        {page.imageUrl?.trim() ? (
          <Image
            source={{ uri: page.imageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onLoad={(event) => {
              const { width: w, height: h } = event.nativeEvent.source;
              if (w > 0 && h > 0) {
                dimensions.set(page.imageUrl, w / h);
                if (dimensions.size > 1500) dimensions.delete(dimensions.keys().next().value!);
                setRatio(w / h);
                setDecoded(true);
              }
            }}
          />
        ) : (
          <Text style={{ color: 'white', padding: 20 }}>Page image unavailable</Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}
export function ZoomablePage({
  page,
  onTapScreen,
  paged = false,
  onGestureActive,
  viewportHeight: suppliedHeight,
  initialView,
  onLocationReady,
  onNavigateLeft,
  onNavigateRight,
}: {
  page: MangaPage;
  onTapScreen: () => void;
  paged?: boolean;
  onGestureActive?: (active: boolean) => void;
  viewportHeight?: number;
  initialView?: { fraction: number; scale: number; pan: number };
  onLocationReady?: (read: () => { fraction: number; scale: number; pan: number }) => void;
  onNavigateLeft?: () => void;
  onNavigateRight?: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const viewportHeight = Math.max(100, suppliedHeight ?? height - 100);
  const contentHeight = useSharedValue(viewportHeight);
  const initialRatio = page.aspectRatio || 0.67;
  const initialPageWidth =
    paged && initialRatio >= 0.5 ? Math.min(width, viewportHeight * initialRatio) : width;
  const contentWidth = useSharedValue(initialPageWidth);
  const [gestureLock, setGestureLock] = useState(false);
  const zoom = useReaderZoom(
    width,
    viewportHeight,
    onTapScreen,
    (active) => {
      setGestureLock(active);
      onGestureActive?.(active);
    },
    contentHeight,
    initialView,
    onNavigateLeft,
    onNavigateRight,
    contentWidth,
  );
  useEffect(() => {
    onLocationReady?.(() => ({
      fraction: Math.max(0, Math.min(1, zoom.scrollY.value / contentHeight.value)),
      scale: zoom.scale.value,
      pan: zoom.x.value / width,
    }));
  }, [onLocationReady, width]);
  const [restored, setRestored] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const restoreView = () => {
    if (!initialView || restored || !contentReady) return;
    setRestored(true);
    zoom.scrollRef.current?.scrollTo({
      y: initialView.fraction * contentHeight.value,
      animated: false,
    });
    onGestureActive?.(initialView.scale > 1.01);
  };
  useEffect(() => {
    restoreView();
  }, [contentReady, initialView]);
  // Worklets must capture shared values, never the gesture-bearing hook result.
  const { scale } = zoom;
  const contentStyle = useAnimatedStyle(() => ({ minHeight: viewportHeight / scale.value }));
  return (
    <GestureDetector gesture={zoom.gesture}>
      <View
        style={{ width, height: viewportHeight, backgroundColor: 'black', overflow: 'hidden' }}
        collapsable={false}
      >
        <Animated.View style={zoom.viewportStyle}>
          <GestureDetector gesture={zoom.nativeGesture}>
            <Animated.ScrollView
              ref={zoom.scrollRef}
              onScroll={zoom.scrollHandler}
              onContentSizeChange={restoreView}
              scrollEventThrottle={16}
              scrollEnabled={!gestureLock}
              decelerationRate={0.993}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
              style={contentStyle}
              bounces={!gestureLock}
              overScrollMode={gestureLock ? 'never' : 'auto'}
            >
              <FittedPage
                key={page.imageUrl}
                page={page}
                width={width}
                height={viewportHeight}
                paged={paged}
                onHeight={(value) => {
                  contentHeight.value = value;
                  setContentReady(true);
                }}
                onWidth={(value) => {
                  contentWidth.value = value;
                }}
                scale={zoom.scale}
                x={zoom.x}
              />
            </Animated.ScrollView>
          </GestureDetector>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
