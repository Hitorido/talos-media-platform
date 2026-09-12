import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui';
import { cn } from '@/utils/cn';
import { getLanguageBadge, getLanguageDisplayName } from '@/utils/languageUtils';

export type LanguageOption = {
  code: string; // 'all' or ISO code like 'en', 'fr', 'ja'
  label: string;
  count: number;
};

type LanguageSelectorProps = {
  availableLanguages: string[]; // List of distinct language codes found in chapters
  selectedLanguage: string; // 'all' or specific code e.g. 'en'
  chaptersByLanguageCount: Record<string, number>;
  totalReleasesCount: number;
  onSelectLanguage: (languageCode: string) => void;
};

export function LanguageSelector({
  availableLanguages,
  selectedLanguage,
  chaptersByLanguageCount,
  totalReleasesCount,
  onSelectLanguage,
}: LanguageSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);

  // If there's 1 or 0 languages available, we can still show a minimal indicator
  if (availableLanguages.length === 0) {
    return null;
  }

  const selectedLabel =
    selectedLanguage === 'all'
      ? `All Languages (${totalReleasesCount})`
      : `${getLanguageDisplayName(selectedLanguage)} (${chaptersByLanguageCount[selectedLanguage] ?? 0})`;

  const options: LanguageOption[] = [
    ...availableLanguages.map((code) => ({
      code,
      label: getLanguageDisplayName(code),
      count: chaptersByLanguageCount[code] ?? 0,
    })),
    {
      code: 'all',
      label: 'All Languages',
      count: totalReleasesCount,
    },
  ];

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setModalVisible(true)}
        className="flex-row items-center gap-1.5 rounded-xl border border-neutral-300 bg-neutral-100 px-3 py-1.5 active:opacity-80 dark:border-neutral-700 dark:bg-neutral-800"
      >
        <Ionicons name="globe-outline" size={15} color="#6366f1" />
        <Text variant="caption" className="font-semibold text-neutral-800 dark:text-neutral-200">
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#9ca3af" />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/60"
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            className="max-h-[70%] rounded-t-3xl border-t border-neutral-800 bg-neutral-900 p-5 pb-8"
            onPress={(e) => e.stopPropagation?.()}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <View className="gap-0.5">
                <Text variant="h3" className="text-white">
                  Select Language
                </Text>
                <Text variant="caption" tone="muted">
                  Choose chapter translation language
                </Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                className="rounded-full bg-neutral-800 p-2"
              >
                <Ionicons name="close" size={18} color="#9ca3af" />
              </Pressable>
            </View>

            <ScrollView className="gap-2">
              {options.map((option) => {
                const isSelected = selectedLanguage === option.code;
                const badge = option.code === 'all' ? 'ALL' : getLanguageBadge(option.code);

                return (
                  <Pressable
                    key={option.code}
                    onPress={() => {
                      onSelectLanguage(option.code);
                      setModalVisible(false);
                    }}
                    className={cn(
                      'mb-2 flex-row items-center justify-between rounded-2xl border p-3.5',
                      isSelected
                        ? 'border-primary-500 bg-primary-500/15'
                        : 'border-neutral-800 bg-neutral-950/60 active:bg-neutral-800',
                    )}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className={cn(
                          'h-8 w-11 items-center justify-center rounded-lg border',
                          isSelected
                            ? 'border-primary-500 bg-primary-500/25'
                            : 'border-neutral-700 bg-neutral-800',
                        )}
                      >
                        <Text
                          className={cn(
                            'text-xs font-bold',
                            isSelected ? 'text-primary-400' : 'text-neutral-300',
                          )}
                        >
                          {badge}
                        </Text>
                      </View>
                      <View>
                        <Text
                          className={cn(
                            'text-base font-semibold',
                            isSelected ? 'text-primary-400' : 'text-white',
                          )}
                        >
                          {option.label}
                        </Text>
                        <Text variant="caption" tone="muted">
                          {option.count} {option.count === 1 ? 'chapter' : 'chapters'}
                        </Text>
                      </View>
                    </View>

                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color="#6366f1" />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color="#525252" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
