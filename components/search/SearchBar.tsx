import { Pressable, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useAppTheme } from '@/providers/ThemeProvider';
import { cn } from '@/utils/cn';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
};

export function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search anime, manga, novels...',
  className,
}: SearchBarProps) {
  const { isDark, theme } = useAppTheme();
  const textColor = theme.colors.foreground;
  const mutedColor = theme.colors.mutedForeground;
  const borderColor = theme.colors.border;
  const backgroundColor = theme.colors.card;

  return (
    <View
      className={cn('flex-row items-center rounded-xl border px-3', className)}
      style={{ borderColor, backgroundColor }}
    >
      <Text style={{ color: mutedColor, fontSize: 16 }}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={mutedColor}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        selectionColor={theme.colors.primary}
        style={{
          flex: 1,
          marginLeft: 8,
          paddingVertical: 12,
          fontSize: 16,
          color: textColor,
        }}
      />
      {value.length > 0 && onClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={onClear}
          hitSlop={8}
          className="ml-2 h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: isDark ? theme.colors.muted : theme.colors.secondary }}
        >
          <Text variant="label" style={{ color: mutedColor, lineHeight: 20 }}>
            ×
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
