import { Text } from '@/components/ui';
import { cn } from '@/utils/cn';
import { ScrollView, TouchableOpacity } from 'react-native';

type SourceFilterProps = {
  sources: string[];
  value: string;
  onChange: (source: string) => void;
};

export function SourceFilter({ sources, value, onChange }: SourceFilterProps) {
  // Don't add "All sources" if it's already in the array
  const displaySources = sources.includes('All sources') ? sources : ['All sources', ...sources];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {displaySources.map((source) => {
        const isActive = value === source;

        return (
          <TouchableOpacity
            key={source}
            onPress={() => onChange(source)}
            activeOpacity={0.7}
            className={cn(
              'rounded-full px-3 py-1.5',
              isActive
                ? 'bg-primary-600 dark:bg-primary-500'
                : 'bg-neutral-100 dark:bg-neutral-800',
            )}
          >
            <Text
              variant="label"
              className={isActive ? 'text-white' : 'text-neutral-700 dark:text-neutral-200'}
              numberOfLines={1}
            >
              {source}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
