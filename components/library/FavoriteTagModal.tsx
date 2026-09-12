import { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import type { LibraryEntry } from '@/types/library';
import { cn } from '@/utils/cn';

type FavoriteTagModalProps = {
  visible: boolean;
  entry?: LibraryEntry;
  tags: string[];
  onClose: () => void;
  onConfirm: (tags: string[]) => void;
  onCreateTag: (tag: string) => void;
};

export function FavoriteTagModal({
  visible,
  entry,
  tags,
  onClose,
  onConfirm,
  onCreateTag,
}: FavoriteTagModalProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(entry?.tags ?? ['Favorites']);
  const [newTag, setNewTag] = useState('');

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  };

  const createTag = () => {
    const normalizedTag = newTag.trim();
    if (!normalizedTag || tags.includes(normalizedTag)) return;
    onCreateTag(normalizedTag);
    setSelectedTags((current) => [...current, normalizedTag]);
    setNewTag('');
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/55 px-6" onPress={onClose}>
        <Pressable
          className="w-full max-w-md rounded-2xl bg-neutral-950 p-5"
          onPress={() => undefined}
        >
          <Text variant="h2" className="text-white">
            Save to
          </Text>
          <Text tone="muted" className="mt-1">
            Choose a category for this favorite.
          </Text>

          <View className="mt-4 flex-row flex-wrap gap-2">
            {tags.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                className={cn(
                  'rounded-full border px-3 py-2',
                  selectedTags.includes(tag)
                    ? 'border-primary-500 bg-primary-500/20'
                    : 'border-neutral-700 bg-neutral-900',
                )}
              >
                <Text className={selectedTags.includes(tag) ? 'text-primary-300' : 'text-white'}>
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="mt-4 flex-row items-center gap-2">
            <TextInput
              value={newTag}
              onChangeText={setNewTag}
              onSubmitEditing={createTag}
              placeholder="New tag"
              placeholderTextColor="#737373"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              returnKeyType="done"
            />
            <Pressable
              accessibilityLabel="Create tag"
              onPress={createTag}
              className="h-10 w-10 items-center justify-center rounded-full bg-primary-600"
            >
              <Text className="text-xl text-white">+</Text>
            </Pressable>
          </View>

          <View className="mt-5 flex-row justify-end gap-2">
            <Button label="Cancel" variant="outline" onPress={onClose} />
            <Button label="Save Favorite" onPress={() => onConfirm(selectedTags)} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
