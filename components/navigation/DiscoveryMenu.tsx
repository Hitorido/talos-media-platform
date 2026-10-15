import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/authStore';
export const discoveryCategories = [
  'anime',
  'manga',
  'manhwa',
  'manhua',
  'novel',
  'movies',
  'tv',
] as const;
export const categoryName = (value: string) =>
  value === 'tv'
    ? 'TV Shows'
    : value === 'novel'
      ? 'Novels'
      : value.charAt(0).toUpperCase() + value.slice(1);
export function DiscoveryMenu() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel="Open discovery sidebar"
        className="rounded-xl bg-primary-100 p-3 dark:bg-primary-950"
      >
        <Ionicons name="menu" size={24} color="#818cf8" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-black/60">
          <Pressable
            className="absolute inset-0"
            onPress={() => setOpen(false)}
            accessibilityLabel="Close sidebar"
          />
          <ScrollView
            className="h-full w-80 max-w-[85%] bg-white dark:bg-neutral-950"
            contentContainerStyle={{
              padding: 20,
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 20,
            }}
          >
            <View className="mb-5 flex-row items-center gap-3">
              <Image
                source={require('../../assets/images/icon.png')}
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
              <View>
                <Text variant="h3">{user?.username || 'Guest'}</Text>
                <Text variant="caption" tone="muted">
                  {user ? 'Signed in' : 'Not signed in'}
                </Text>
              </View>
            </View>
            <Text variant="h3" className="mb-2">
              Explore
            </Text>
            {discoveryCategories.map((category) => (
              <Pressable
                key={category}
                onPress={() => {
                  setOpen(false);
                  router.push(('/discover/' + category) as Href);
                }}
                className="mb-2 flex-row items-center justify-between rounded-xl bg-neutral-100 p-3 dark:bg-neutral-900"
              >
                <Text>{categoryName(category)}</Text>
                <Ionicons name="chevron-forward" size={16} color="#818cf8" />
              </Pressable>
            ))}
            <Text variant="h3" className="mb-2 mt-4">
              Community
            </Text>
            {['Messages', 'Templates', 'Community recommendations', 'Friends', 'Community'].map(
              (label) => (
                <View key={label} className="flex-row items-center justify-between py-3">
                  <Text tone="muted">{label}</Text>
                  <Text variant="caption" tone="muted">
                    Coming later
                  </Text>
                </View>
              ),
            )}
            <Pressable
              disabled={!user}
              className="mt-4 rounded-xl bg-primary-100 p-3 dark:bg-primary-950"
              onPress={() => {
                setOpen(false);
                if (user) void logout();
              }}
            >
              <Text tone="primary">{user ? 'Log out' : 'Account sign-in: coming later'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
