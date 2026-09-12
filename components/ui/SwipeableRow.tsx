import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const translateX = useRef(new Animated.Value(0)).current;
  const isDismissed = useRef(false);
  const [isSwiping, setIsSwiping] = useState(false);

  const actionOpacity = translateX.interpolate({
    inputRange: [0, 24, SWIPE_THRESHOLD],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const resetPosition = (onComplete?: () => void) => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start(({ finished }) => {
      if (finished) {
        setIsSwiping(false);
        onComplete?.();
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (disabled || isDismissed.current) return false;
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
          isDismissed.current = true;
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onSwipeRight?.();
          });
          return;
        }

        resetPosition();
      },
      onPanResponderTerminate: () => {
        resetPosition();
      },
    }),
  ).current;

  const handleManualAction = () => {
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

  return (
    <View style={styles.container}>
      {isSwiping ? (
        <View style={styles.backgroundAction}>
          <Animated.View style={[styles.actionContent, { opacity: actionOpacity }]}>
            <Pressable onPress={handleManualAction} style={styles.actionPressable}>
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
