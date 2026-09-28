import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui';

export type SelectionOption = { value: string; label: string };

/** A shared accessible picker; opening or dismissing never changes the selection. */
export function SelectionModal({ visible, title, options, value, onSelect, onClose }: {
  visible: boolean; title: string; options: SelectionOption[]; value?: string;
  onSelect: (value: string) => void; onClose: () => void;
}) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View className="flex-1 justify-center bg-black/60 px-6">
      <Pressable accessibilityLabel="Dismiss selection" className="absolute inset-0" onPress={onClose} />
      <View className="max-h-[70%] rounded-2xl bg-white p-4 dark:bg-neutral-900">
        <Text variant="h3" className="mb-3">{title}</Text>
        <ScrollView>
          {options.map(option => <Pressable key={option.value} accessibilityRole="radio"
            accessibilityState={{ checked: value === option.value }}
            onPress={() => { onSelect(option.value); onClose(); }} className="rounded-lg px-3 py-3">
            <Text tone={value === option.value ? 'primary' : 'default'}>{option.label}{value === option.value ? ' ✓' : ''}</Text>
          </Pressable>)}
        </ScrollView>
        <Pressable onPress={onClose} className="self-end p-3"><Text tone="primary">Cancel</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

/** Ranges refer to catalog positions, so fractional chapter numbers are never omitted. */
export function ChapterRangePicker({ count, value, onChange }: { count: number; value: number; onChange: (value: number) => void }) {
  const [open, setOpen] = useState(false);
  const options = Array.from({ length: Math.ceil(count / 100) }, (_, index) => ({
    value: String(index), label: `${index * 100 + 1}–${Math.min(count, (index + 1) * 100)}`,
  }));
  if (count <= 100) return null;
  const selected = Math.min(value, options.length - 1);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Choose chapter or episode range"
      onPress={() => setOpen(true)} className="rounded-full bg-primary-100 px-3 py-2 dark:bg-primary-950">
      <Text tone="primary" variant="caption">{options[selected].label} ▾</Text>
    </Pressable>
    <SelectionModal visible={open} title="Choose range" options={options} value={String(selected)}
      onSelect={next => onChange(Number(next))} onClose={() => setOpen(false)} />
  </>;
}

export function chapterRange<T>(items: T[], range: number): T[] {
  const start = Math.max(0, Math.min(range, Math.ceil(items.length / 100) - 1)) * 100;
  return items.slice(start, start + 100);
}
