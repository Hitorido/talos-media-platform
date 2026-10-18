import { ScrollView, View } from 'react-native';
import { Button } from '@/components/ui';
export function GenreFilters({
  genres,
  value,
  onChange,
}: {
  genres: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (!genres.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-2">
        {['All genres', ...genres].map((genre) => (
          <Button
            key={genre}
            size="sm"
            variant={value === genre ? 'primary' : 'secondary'}
            label={genre}
            onPress={() => onChange(genre)}
          />
        ))}
      </View>
    </ScrollView>
  );
}
