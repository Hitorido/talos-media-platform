import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui';
import type { DownloadSectionTab } from '@/types/download';
import { cn } from '@/utils/cn';

type DownloadSectionTabsProps = {
  activeTab: DownloadSectionTab;
  counts: Record<DownloadSectionTab, number>;
  onSelectTab: (tab: DownloadSectionTab) => void;
};

const tabs: { key: DownloadSectionTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'queued', label: 'Queued' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
];

export function DownloadSectionTabs({ activeTab, counts, onSelectTab }: DownloadSectionTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2 px-4 py-2"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const count = counts[tab.key] ?? 0;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelectTab(tab.key)}
            className={cn(
              'flex-row items-center gap-1.5 rounded-full border px-3.5 py-1.5',
              isActive
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900',
            )}
          >
            <Text
              className={cn(
                'text-xs font-semibold',
                isActive
                  ? 'text-primary-500 dark:text-primary-400'
                  : 'text-neutral-700 dark:text-neutral-300',
              )}
            >
              {tab.label}
            </Text>
            {count > 0 ? (
              <View
                className={cn(
                  'rounded-full px-1.5 py-0.5',
                  isActive ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-800',
                )}
              >
                <Text
                  className={cn(
                    'text-[10px] font-bold',
                    isActive ? 'text-white' : 'text-neutral-600 dark:text-neutral-400',
                  )}
                >
                  {count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
