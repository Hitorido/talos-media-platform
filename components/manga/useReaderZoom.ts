import { useCallback, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const FIT_SCALE = 1;
const DOUBLE_TAP_SCALE = 2;
const ZOOM_DURATION_MS = 280;
const ZOOM_EASING = Easing.out(Easing.cubic);

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

function horizontalLimit(
  scaleValue: number,
  viewportWidth: number,
  contentWidth: number,
) {
  'worklet';
  // RN applies transform right→left: scale then translateX → x is screen pixels.
  return Math.max(0, (Math.max(contentWidth, 0) * scaleValue - viewportWidth) / 2);
}

/** Scale the viewport as one surface; page rows never resize independently during a gesture. */
export function useReaderZoom(
  width: number,
  height: number,
  onTap: () => void,
  onActive?: (active: boolean) => void,
  contentHeight?: SharedValue<number>,
  initialView?: { scale: number; pan: number },
  onNavigateLeft?: () => void,
  onNavigateRight?: () => void,
  contentWidth?: SharedValue<number>,
) {
  const callbacks = useRef({ onTap, onActive, onNavigateLeft, onNavigateRight });
  callbacks.current = { onTap, onActive, onNavigateLeft, onNavigateRight };
  const notifyTap = useCallback(() => callbacks.current.onTap(), []);
  const notifyActive = useCallback((active: boolean) => callbacks.current.onActive?.(active), []);
  const notifyNavigateLeft = useCallback(() => callbacks.current.onNavigateLeft?.(), []);
  const notifyNavigateRight = useCallback(() => callbacks.current.onNavigateRight?.(), []);

  const pageWidth = contentWidth;
  const initialScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, initialView?.scale || FIT_SCALE));
  const initialLimit = Math.max(0, (width * initialScale - width) / 2);
  const scale = useSharedValue(initialScale);
  const x = useSharedValue(
    clamp((initialView?.pan || 0) * width, -initialLimit, initialLimit),
  );
  const scrollY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const anchorScroll = useSharedValue(0);
  const anchorY = useSharedValue(0);
  const anchorX = useSharedValue(0);
  const pinching = useSharedValue(false);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const touchStartX = useSharedValue(0);
  const touchStartY = useSharedValue(0);
  const scrollRef = useAnimatedRef<any>();

  const zoomAnimating = useSharedValue(false);
  const zoomProgress = useSharedValue(0);
  const zoomFromScale = useSharedValue(1);
  const zoomToScale = useSharedValue(1);
  const zoomFromX = useSharedValue(0);
  const zoomToX = useSharedValue(0);
  const zoomFromScroll = useSharedValue(0);
  const zoomToScroll = useSharedValue(0);

  const flingingX = useSharedValue(false);
  const flingingScroll = useSharedValue(false);
  const flingScroll = useSharedValue(0);
  const lastVx = useSharedValue(0);
  const lastVy = useSharedValue(0);
  // True while our pan/fling drives scroll — ignore native onScroll echoes.
  const drivingScroll = useSharedValue(false);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    if (drivingScroll.value || flingingScroll.value || zoomAnimating.value || pinching.value) return;
    scrollY.value = event.contentOffset.y;
  });

  const viewportStyle = useAnimatedStyle(() => ({
    height: height / scale.value,
    transformOrigin: 'top center' as const,
    transform: [{ translateX: x.value }, { scale: scale.value }],
  }));

  const pageLimit = () => {
    'worklet';
    return horizontalLimit(scale.value, width, pageWidth?.value ?? width);
  };

  const maxScrollForScale = (s: number) => {
    'worklet';
    return contentHeight ? Math.max(0, contentHeight.value - height / Math.max(s, 0.001)) : 1_000_000;
  };

  useAnimatedReaction(
    () => scale.value,
    (next, previous) => {
      if (previous === null || next === previous) return;
      if (zoomAnimating.value || !pinching.value) return;
      const oldPadding = contentHeight
        ? Math.max(0, (height / startScale.value - contentHeight.value) / 2)
        : 0;
      const newPadding = contentHeight ? Math.max(0, (height / next - contentHeight.value) / 2) : 0;
      const target = clamp(
        anchorScroll.value +
          anchorY.value / startScale.value -
          oldPadding -
          anchorY.value / next +
          newPadding,
        0,
        maxScrollForScale(next),
      );
      scrollY.value = target;
      scrollTo(scrollRef, 0, target, false);
    },
  );

  useAnimatedReaction(
    () => zoomProgress.value,
    (progress) => {
      if (!zoomAnimating.value) return;
      const nextScale = interpolate(progress, [0, 1], [zoomFromScale.value, zoomToScale.value]);
      const nextX = interpolate(progress, [0, 1], [zoomFromX.value, zoomToX.value]);
      const nextScroll = interpolate(progress, [0, 1], [zoomFromScroll.value, zoomToScroll.value]);
      scale.value = nextScale;
      x.value = nextX;
      scrollTo(scrollRef, 0, Math.max(0, nextScroll), false);
      scrollY.value = Math.max(0, nextScroll);
    },
  );

  useAnimatedReaction(
    () => flingScroll.value,
    (value, previous) => {
      if (!flingingScroll.value || previous === null) return;
      const next = Math.max(0, value);
      scrollTo(scrollRef, 0, next, false);
      scrollY.value = next;
    },
  );

  useAnimatedReaction(
    () => (pageWidth?.value ?? width) + scale.value,
    () => {
      if (zoomAnimating.value || flingingX.value) return;
      const limit = pageLimit();
      x.value = clamp(x.value, -limit, limit);
    },
  );

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onTouchesDown((event) => {
        if (event.numberOfTouches >= 2) runOnJS(notifyActive)(true);
      })
      .onStart((e) => {
        pinching.value = true;
        zoomAnimating.value = false;
        cancelAnimation(zoomProgress);
        cancelAnimation(flingScroll);
        cancelAnimation(scale);
        cancelAnimation(x);
        flingingScroll.value = false;
        flingingX.value = false;
        drivingScroll.value = false;
        startScale.value = scale.value;
        startX.value = x.value;
        anchorScroll.value = scrollY.value;
        anchorY.value = e.focalY;
        anchorX.value = e.focalX - width / 2;
        runOnJS(notifyActive)(true);
      })
      .onUpdate((e) => {
        const next = clamp(startScale.value * e.scale, MIN_SCALE, MAX_SCALE);
        const cw = pageWidth?.value ?? width;
        const limit = horizontalLimit(next, width, cw);
        x.value = clamp(
          anchorX.value * (1 - next / startScale.value) + (startX.value * next) / startScale.value,
          -limit,
          limit,
        );
        scale.value = next;
      })
      .onFinalize(() => {
        pinching.value = false;
        const cw = pageWidth?.value ?? width;
        const limit = horizontalLimit(scale.value, width, cw);
        x.value = clamp(x.value, -limit, limit);
        if (scale.value < 1.01) {
          scale.value = withTiming(FIT_SCALE, { duration: 160 });
          x.value = withTiming(0, { duration: 160 });
        } else {
          x.value = withTiming(clamp(x.value, -limit, limit), { duration: 160 });
        }
        runOnJS(notifyActive)(scale.value > 1.01);
      });

    const double = Gesture.Tap()
      .onBegin(() => {
        scrollTo(scrollRef, 0, scrollY.value, false);
      })
      .onTouchesDown((e, manager) => {
        if (e.numberOfTouches !== 1) manager.fail();
      })
      .numberOfTaps(2)
      .maxDelay(250)
      .maxDistance(18)
      .onEnd((_e, ok) => {
        if (!ok || pinching.value) return;

        cancelAnimation(zoomProgress);
        cancelAnimation(flingScroll);
        cancelAnimation(scale);
        cancelAnimation(x);
        flingingScroll.value = false;
        flingingX.value = false;
        drivingScroll.value = false;

        const currentScale = scale.value;
        const currentX = x.value;
        const currentScroll = scrollY.value;
        const zoomingIn = Math.abs(currentScale - FIT_SCALE) < 0.05;
        const targetScale = zoomingIn ? DOUBLE_TAP_SCALE : FIT_SCALE;

        let targetX = 0;
        let targetScroll = currentScroll;

        if (zoomingIn) {
          const ratio = targetScale / Math.max(currentScale, 0.001);
          const cw = pageWidth?.value ?? width;
          const limit = horizontalLimit(targetScale, width, cw);
          targetX = clamp((_e.x - width / 2) * (1 - ratio) + currentX * ratio, -limit, limit);

          const oldPadding = contentHeight
            ? Math.max(0, (height / currentScale - contentHeight.value) / 2)
            : 0;
          const newPadding = contentHeight
            ? Math.max(0, (height / targetScale - contentHeight.value) / 2)
            : 0;
          targetScroll = Math.max(
            0,
            currentScroll + _e.y / currentScale - oldPadding - _e.y / targetScale + newPadding,
          );
          if (contentHeight) {
            targetScroll = clamp(targetScroll, 0, maxScrollForScale(targetScale));
          }
        } else {
          targetX = 0;
          const viewportCenterY = height / 2;
          const oldPadding = contentHeight
            ? Math.max(0, (height / currentScale - contentHeight.value) / 2)
            : 0;
          const newPadding = contentHeight
            ? Math.max(0, (height / targetScale - contentHeight.value) / 2)
            : 0;
          targetScroll = Math.max(
            0,
            currentScroll +
              viewportCenterY / currentScale -
              oldPadding -
              viewportCenterY / targetScale +
              newPadding,
          );
          if (contentHeight) {
            targetScroll = clamp(targetScroll, 0, maxScrollForScale(targetScale));
          } else {
            targetScroll = currentScroll;
          }
        }

        zoomFromScale.value = currentScale;
        zoomToScale.value = targetScale;
        zoomFromX.value = currentX;
        zoomToX.value = targetX;
        zoomFromScroll.value = currentScroll;
        zoomToScroll.value = targetScroll;
        zoomProgress.value = 0;
        zoomAnimating.value = true;
        startScale.value = currentScale;

        zoomProgress.value = withTiming(
          1,
          { duration: ZOOM_DURATION_MS, easing: ZOOM_EASING },
          (finished) => {
            if (finished) {
              scale.value = targetScale;
              x.value = targetX;
              scrollY.value = targetScroll;
              scrollTo(scrollRef, 0, targetScroll, false);
            }
            zoomAnimating.value = false;
            runOnJS(notifyActive)(targetScale > 1.01);
          },
        );

        runOnJS(notifyActive)(true);
      });

    const tap = Gesture.Tap()
      .onTouchesDown((e, manager) => {
        if (e.numberOfTouches !== 1) manager.fail();
      })
      .maxDistance(12)
      .onEnd((_e, ok) => {
        if (ok) runOnJS(notifyTap)();
      });

    const pan = Gesture.Pan()
      .manualActivation(true)
      .maxPointers(1)
      .onTouchesDown((e, manager) => {
        if (scale.value <= 1.01 || e.numberOfTouches !== 1 || zoomAnimating.value) {
          manager.fail();
          return;
        }
        touchStartX.value = e.allTouches[0].x;
        touchStartY.value = e.allTouches[0].y;
      })
      .onTouchesMove((e, manager) => {
        if (e.numberOfTouches !== 1) {
          manager.fail();
          return;
        }
        const dx = e.allTouches[0].x - touchStartX.value;
        const dy = e.allTouches[0].y - touchStartY.value;
        if (dx * dx + dy * dy >= 9) manager.activate();
      })
      .onStart(() => {
        cancelAnimation(x);
        cancelAnimation(zoomProgress);
        cancelAnimation(flingScroll);
        zoomAnimating.value = false;
        flingingScroll.value = false;
        flingingX.value = false;
        drivingScroll.value = true;
        panStartX.value = x.value;
        panStartY.value = scrollY.value;
        lastVx.value = 0;
        lastVy.value = 0;
        runOnJS(notifyActive)(true);
      })
      .onUpdate((e) => {
        if (pinching.value || e.numberOfPointers !== 1) {
          const s = Math.max(scale.value, 0.001);
          const hx = 1 / Math.sqrt(s);
          panStartX.value = x.value - e.translationX * hx;
          panStartY.value = scrollY.value + e.translationY / s;
          return;
        }
        const s = Math.max(scale.value, 0.001);
        const limit = pageLimit();
        const hx = 1 / Math.sqrt(s);
        x.value = clamp(panStartX.value + e.translationX * hx, -limit, limit);
        // Live scroll so pages stay loaded (no black bars until finger-up).
        const newY = clamp(panStartY.value - e.translationY / s, 0, maxScrollForScale(s));
        scrollY.value = newY;
        scrollTo(scrollRef, 0, newY, false);
        lastVx.value = e.velocityX * hx;
        lastVy.value = e.velocityY / s;
      })
      .onEnd((e, success) => {
        if (!success || pinching.value) {
          drivingScroll.value = false;
          return;
        }
        const s = Math.max(scale.value, 0.001);
        const hx = 1 / Math.sqrt(s);
        const limit = pageLimit();
        x.value = clamp(x.value, -limit, limit);
        if (s <= 1.01) {
          x.value = withTiming(0, { duration: 160 });
          drivingScroll.value = false;
          runOnJS(notifyActive)(false);
          return;
        }

        const vx = Math.abs(e.velocityX) > 20 ? e.velocityX * hx : lastVx.value;
        const vy = Math.abs(e.velocityY) > 20 ? e.velocityY / s : lastVy.value;
        const atLeft = x.value >= limit - 4;
        const atRight = x.value <= -limit + 4;

        if (Math.abs(e.velocityX) > 500 && s > 1.05 && limit >= 2) {
          if (e.velocityX > 0 && atLeft) {
            drivingScroll.value = false;
            runOnJS(notifyNavigateLeft)();
            return;
          }
          if (e.velocityX < 0 && atRight) {
            drivingScroll.value = false;
            runOnJS(notifyNavigateRight)();
            return;
          }
        }

        if (limit >= 2 && Math.abs(vx) > 15) {
          flingingX.value = true;
          x.value = withDecay(
            { velocity: vx, clamp: [-limit, limit], deceleration: 0.997 },
            (finished) => {
              flingingX.value = false;
              if (finished) x.value = clamp(x.value, -limit, limit);
            },
          );
        } else {
          x.value = withTiming(clamp(x.value, -limit, limit), { duration: 120 });
        }

        if (Math.abs(vy) > 15) {
          const maxScroll = maxScrollForScale(s);
          flingScroll.value = scrollY.value;
          flingingScroll.value = true;
          flingScroll.value = withDecay(
            { velocity: -vy, clamp: [0, maxScroll], deceleration: 0.997 },
            () => {
              flingingScroll.value = false;
              drivingScroll.value = false;
            },
          );
        } else {
          drivingScroll.value = false;
        }
        runOnJS(notifyActive)(true);
      })
      .onFinalize((_e, success) => {
        if (!success) {
          drivingScroll.value = false;
          if (scale.value <= 1.01) runOnJS(notifyActive)(false);
        }
      });

    const native = Gesture.Native()
      .requireExternalGestureToFail(double)
      .requireExternalGestureToFail(pan)
      .simultaneousWithExternalGesture(pinch, tap);

    return { touch: Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(double, tap)), native };
  }, [width, height, notifyTap, notifyActive, notifyNavigateLeft, notifyNavigateRight, contentHeight, pageWidth]);

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
