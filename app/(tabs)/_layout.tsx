import { Tabs } from 'expo-router';
import type { SymbolViewProps } from 'expo-symbols';

import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAppTheme } from '@/providers/ThemeProvider';

const homeIcon = {
  ios: 'house.fill',
  android: 'home',
  web: 'home',
} as SymbolViewProps['name'];

const searchIcon = {
  ios: 'magnifyingglass',
  android: 'search',
  web: 'search',
} as SymbolViewProps['name'];

const libraryIcon = {
  ios: 'books.vertical.fill',
  android: 'library_books',
  web: 'library_books',
} as SymbolViewProps['name'];

const downloadsIcon = {
  ios: 'arrow.down.circle.fill',
  android: 'download',
  web: 'download',
} as SymbolViewProps['name'];

const settingsIcon = {
  ios: 'gearshape.fill',
  android: 'settings',
  web: 'settings',
} as SymbolViewProps['name'];

export default function TabLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.tabIconSelected,
        tabBarInactiveTintColor: theme.colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.foreground,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon color={color} name={homeIcon} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon color={color} name={searchIcon} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <TabBarIcon color={color} name={libraryIcon} />,
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: 'Downloads',
          tabBarIcon: ({ color }) => <TabBarIcon color={color} name={downloadsIcon} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon color={color} name={settingsIcon} />,
        }}
      />
    </Tabs>
  );
}
