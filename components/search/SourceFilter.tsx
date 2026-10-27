import { PopPressable as Pressable } from '@/components/ui/PopPressable';
import { ScrollView } from 'react-native';
import { Text } from '@/components/ui';
import { cn } from '@/utils/cn';

type SourceFilterProps = {
  sources: string[];
  value: string;
  onChange: (source: string) => void;
};

export function SourceFilter({ sources, value, onChange }: SourceFilterProps) {
  const allSources = ['All sources', ...sources];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {allSources.map((source) => {
        const isActive = value === source;

        return (
          <Pressable
            key={source}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(source)}
            className={cn(
              'rounded-full px-3 py-1.5',
              isActive
                ? 'bg-primary-600 dark:bg-primary-500'
                : 'bg-neutral-100 dark:bg-neutral-800',
            )}
          >
            <Text
              variant="caption"
              className={isActive ? 'text-white' : 'text-neutral-700 dark:text-neutral-200'}
            >
              {source}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
