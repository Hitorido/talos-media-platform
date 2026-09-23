import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
import { useNovelPreferencesStore } from '@/stores/novelPreferencesStore';
import { languageLabel, type NovelLanguage } from '@/utils/novelLanguage';
export function NovelLanguageFilter() {
  const {language, setLanguage} = useNovelPreferencesStore();
  return <View className="flex-row flex-wrap items-center gap-2 px-1 py-2">
    <Text variant="caption" tone="muted">Novels:</Text>
    {(['en','ja','all'] as NovelLanguage[]).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{selected:language === value}} onPress={() => setLanguage(value)} className={language === value ? 'rounded-full bg-primary-600 px-3 py-2' : 'rounded-full bg-neutral-200 px-3 py-2 dark:bg-neutral-800'}>
      <Text variant="caption" className={language === value ? 'text-white' : ''}>{value === 'all' ? 'All languages' : languageLabel(value)}</Text>
    </Pressable>)}
  </View>;
}
