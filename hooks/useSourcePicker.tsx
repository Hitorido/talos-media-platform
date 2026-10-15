import { useState } from 'react';
import { SelectionModal } from '@/components/content/SelectionModal';
import { getProviderDisplayName } from '@/services/contentService';
import { decodeMediaRouteId } from '@/types/provider';
export function useSourcePicker() {
  const [choices, setChoices] = useState<{ id: string; title: string; open: () => void }[]>([]);
  const choose = (items: { id: string; title: string; open: () => void }[]) => {
    if (items.length === 1) items[0].open();
    else setChoices(items);
  };
  const picker = (
    <SelectionModal
      accentOptions
      visible={choices.length > 0}
      title="Choose source"
      options={choices.map((item, index) => ({
        value: String(index),
        label: getProviderDisplayName(decodeMediaRouteId(item.id)?.providerId ?? 'builtin'),
        detail: item.title,
      }))}
      onSelect={(value) => choices[Number(value)]?.open()}
      onClose={() => setChoices([])}
    />
  );
  return { choose, picker };
}
