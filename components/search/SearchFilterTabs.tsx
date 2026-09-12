import { Pressable, ScrollView } from 'react-native';

import { Text } from '@/components/ui';
import type { SearchFilter } from '@/types/search';
import { cn } from '@/utils/cn';

type SearchFilterTabsProps = {
  value: SearchFilter;
  onChange: (filter: SearchFilter) => void;
};

const filters: { label: string; value: SearchFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Anime', value: 'anime' },
  { label: 'Manga', value: 'manga' },
  { label: 'Manhwa', value: 'manhwa' },
  { label: 'Manhua', value: 'manhua' },
  { label: 'Novel', value: 'novel' },
];

export function SearchFilterTabs({ value, onChange }: SearchFilterTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {filters.map((filter) => {
        const isActive = value === filter.value;

        return (
          <Pressable
            key={filter.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(filter.value)}
            className={cn(
              'rounded-full px-4 py-2',
              isActive
                ? 'bg-primary-600 dark:bg-primary-500'
                : 'bg-neutral-100 dark:bg-neutral-800',
            )}
          >
            <Text
              variant="label"
              className={isActive ? 'text-white' : 'text-neutral-700 dark:text-neutral-200'}
            >
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
