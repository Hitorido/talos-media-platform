import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useAnimatedRef,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  scrollTo,
  withTiming,
  cancelAnimation,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

/** Scale the viewport as one surface; page rows never resize independently during a gesture. */
export function useReaderZoom(
  width: number,
  height: number,
  onTap: () => void,
  onActive?: (active: boolean) => void,
  contentHeight?: SharedValue<number>,
  initialView?: { scale: number; pan: number },
) {
  const initialScale = Math.max(0.5, Math.min(3, initialView?.scale || 1));
  const initialLimit = Math.max(0, (width * (initialScale - 1)) / 2);
  const scale = useSharedValue(initialScale),
    x = useSharedValue(
      Math.max(-initialLimit, Math.min(initialLimit, (initialView?.pan || 0) * width)),
    ),
    scrollY = useSharedValue(0);
  const startScale = useSharedValue(1),
    startX = useSharedValue(0);
  const anchorScroll = useSharedValue(0),
    anchorY = useSharedValue(0),
    anchorX = useSharedValue(0);
  const panStartX = useSharedValue(0),
    touchX = useSharedValue(0),
    touchY = useSharedValue(0);
  const scrollRef = useAnimatedRef<any>();
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const viewportStyle = useAnimatedStyle(() => ({
    height: height / scale.value,
    transformOrigin: 'top center' as const,
    transform: [{ translateX: x.value }, { scale: scale.value }],
  }));
  useAnimatedReaction(
    () => scale.value,
    (next, previous) => {
      if (previous === null || next === previous) return;
      const oldPadding = contentHeight
        ? Math.max(0, (height / startScale.value - contentHeight.value) / 2)
        : 0;
      const newPadding = contentHeight ? Math.max(0, (height / next - contentHeight.value) / 2) : 0;
      const target = Math.max(
        0,
        anchorScroll.value +
          anchorY.value / startScale.value -
          oldPadding -
          anchorY.value / next +
          newPadding,
      );
      scrollTo(scrollRef, 0, target, false);
    },
  );
  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onTouchesDown((event) => {
        if (event.numberOfTouches >= 2 && onActive) runOnJS(onActive)(true);
      })
      .onStart((e) => {
        cancelAnimation(scale);
        cancelAnimation(x);
        startScale.value = scale.value;
        startX.value = x.value;
        anchorScroll.value = scrollY.value;
        anchorY.value = e.focalY;
        anchorX.value = e.focalX - width / 2;
        if (onActive) runOnJS(onActive)(true);
      })
      .onUpdate((e) => {
        const next = Math.max(0.5, Math.min(3, startScale.value * e.scale));
        const limit = Math.max(0, (width * (next - 1)) / 2);
        x.value = Math.max(
          -limit,
          Math.min(
            limit,
            anchorX.value * (1 - next / startScale.value) +
              (startX.value * next) / startScale.value,
          ),
        );
        scale.value = next;
      })
      .onFinalize(() => {
        if (onActive) runOnJS(onActive)(Boolean(contentHeight && scale.value > 1.01));
      });
    const double = Gesture.Tap()
      .onTouchesDown((e, manager) => {
        if (e.numberOfTouches !== 1) manager.fail();
      })
      .numberOfTaps(2)
      .maxDelay(250)
      .maxDistance(18)
      .onEnd((e, ok) => {
        if (!ok) return;
        cancelAnimation(scale);
        cancelAnimation(x);
        startScale.value = scale.value;
        anchorScroll.value = scrollY.value;
        anchorY.value = e.y;
        const next = Math.abs(scale.value - 1) < 0.01 ? 2 : 1,
          ratio = next / scale.value;
        const limit = Math.max(0, (width * (next - 1)) / 2);
        x.value = withTiming(
          Math.max(-limit, Math.min(limit, (e.x - width / 2) * (1 - ratio) + x.value * ratio)),
          { duration: 240 },
        );
        scale.value = withTiming(next, { duration: 240 });
        if (onActive) runOnJS(onActive)(Boolean(contentHeight && next > 1.01));
      });
    const tap = Gesture.Tap()
      .onTouchesDown((e, manager) => {
        if (e.numberOfTouches !== 1) manager.fail();
      })
      .maxDistance(12)
      .onEnd((_e, ok) => {
        if (ok) runOnJS(onTap)();
      });
    // Fail immediately at fitted size so the horizontal pager owns ordinary swipes.
    const pan = Gesture.Pan()
      .manualActivation(true)
      .maxPointers(1)
      .onTouchesDown((e, manager) => {
        if (scale.value <= 1.01 || e.numberOfTouches !== 1) {
          manager.fail();
          return;
        }
        touchX.value = e.allTouches[0].x;
        touchY.value = e.allTouches[0].y;
      })
      .onTouchesMove((e, manager) => {
        if (e.numberOfTouches !== 1) {
          manager.fail();
          return;
        }
        const dx = Math.abs(e.allTouches[0].x - touchX.value),
          dy = Math.abs(e.allTouches[0].y - touchY.value);
        if (dy > 8 && dy > dx) manager.fail();
        else if (dx > 6) manager.activate();
      })
      .onStart(() => {
        cancelAnimation(x);
        panStartX.value = x.value;
      })
      .onUpdate((e) => {
        const limit = Math.max(0, (width * (scale.value - 1)) / 2);
        x.value = Math.max(-limit, Math.min(limit, panStartX.value + e.translationX));
      });
    const native = Gesture.Native().simultaneousWithExternalGesture(pinch, pan, double, tap);
    return { touch: Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(double, tap)), native };
  }, [width, height, onTap, onActive]);
  return {
    scale,
    x,
    scrollY,
    gesture: gesture.touch,
    nativeGesture: gesture.native,
    viewportStyle,
    scrollRef,
    scrollHandler,
  };
}
