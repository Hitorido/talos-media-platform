import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, View } from 'react-native';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';

import { Text } from '@/components/ui/Text';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 90;

type SwipeableRowProps = {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
};

export function SwipeableRow({
  children,
  onSwipeRight,
  actionLabel = 'Remove',
  actionIcon = 'trash-outline',
  disabled = false,
}: SwipeableRowProps) {
  // Animated.Value / PanResponder are created once via lazy state init, so no
  // ref is read during render and the interpolator keeps a stable identity
  // across renders (it used to be rebuilt on every render).
  const [translateX] = useState(() => new Animated.Value(0));
  const isDismissed = useRef(false);
  // isSwiping drives background visibility — reset properly when row is re-rendered
  const [isSwiping, setIsSwiping] = useState(false);

  // Latest-value holders. The pan responder is created exactly once, so these
  // keep it from closing over stale props/callbacks.
  const disabledRef = useRef(disabled);
  const resetPositionRef = useRef<() => void>(() => {});
  const dismissRef = useRef<() => void>(() => {});

  const resetPosition = (onComplete?: () => void) => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start(({ finished }) => {
      if (finished) {
        // Hide the red background only after the row has snapped back fully
        setIsSwiping(false);
        onComplete?.();
      }
    });
  };

  const dismiss = () => {
    if (isDismissed.current) return;
    isDismissed.current = true;
    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onSwipeRight?.();
    });
  };

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);
  useEffect(() => {
    resetPositionRef.current = () => resetPosition();
    dismissRef.current = dismiss;
  });

  // Guard lives in a stable callback so the one-time pan responder never reads
  // a ref during render.
  const canStartSwipe = useCallback(() => !disabledRef.current && !isDismissed.current, []);

  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (!canStartSwipe()) return false;
        return gestureState.dx > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!canStartSwipe()) return false;
        return gestureState.dx > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        setIsSwiping(true);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          dismissRef.current();
          return;
        }
        // Not dismissed — snap back AND hide red background
        resetPositionRef.current();
      },
      onPanResponderTerminate: () => {
        resetPositionRef.current();
      },
    }),
  );

  const actionOpacity = useMemo(
    () =>
      translateX.interpolate({
        inputRange: [0, 24, SWIPE_THRESHOLD],
        outputRange: [0, 0, 1],
        extrapolate: 'clamp',
      }),
    [translateX],
  );

  return (
    <View style={styles.container}>
      {/* Red background only shown while actively swiping */}
      {isSwiping ? (
        <View style={styles.backgroundAction}>
          <Animated.View style={[styles.actionContent, { opacity: actionOpacity }]}>
            <Pressable onPress={dismiss} style={styles.actionPressable}>
              <Ionicons name={actionIcon} size={22} color="#ffffff" />
              <Text style={styles.actionLabel}>{actionLabel}</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}

      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.foreground, { transform: [{ translateX }] }]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
  },
  backgroundAction: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    paddingLeft: 20,
  },
  actionContent: {
    alignSelf: 'flex-start',
  },
  actionPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  foreground: {
    width: '100%',
    zIndex: 1,
  },
});
