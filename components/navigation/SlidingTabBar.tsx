import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import { useAppTheme } from '@/providers/ThemeProvider';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function TabItem({
  focused,
  label,
  color,
  icon,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  label: string;
  color: string;
  icon: React.ReactNode;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const [lift] = useState(() => new Animated.Value(focused ? -8 : 0));
  useEffect(() => {
    const motion = Animated.spring(lift, {
      toValue: focused ? -8 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    });
    motion.start();
    return () => motion.stop();
  }, [focused, lift]);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 60 }}
    >
      <Animated.View style={{ alignItems: 'center', gap: 3, transform: [{ translateY: lift }] }}>
        {icon}
        <Text
          numberOfLines={1}
          style={{ color, fontSize: 10, fontWeight: focused ? '700' : '500' }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function SlidingTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { theme } = useAppTheme();
  const [width, setWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(state.index));
  useEffect(() => {
    const motion = Animated.spring(position, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 20,
      stiffness: 170,
    });
    motion.start();
    return () => motion.stop();
  }, [state.index, position]);
  const cell = width / state.routes.length;
  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ flexDirection: 'row', height: 60 }}
      >
        {width > 0 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -5,
              left: (cell - 60) / 2,
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: theme.colors.tabIconSelected,
              opacity: 0.16,
              transform: [{ translateX: Animated.multiply(position, cell) }],
            }}
          />
        )}
        {state.routes.map((route, index) => {
          const options = descriptors[route.key].options;
          const focused = state.index === index;
          const color = focused ? theme.colors.tabIconSelected : theme.colors.tabIconDefault;
          return (
            <TabItem
              key={route.key}
              focused={focused}
              label={options.title ?? route.name}
              color={color}
              icon={options.tabBarIcon?.({ focused, color, size: 24 })}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
