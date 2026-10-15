import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/components/ui';
import { SelectionModal } from './SelectionModal';
import { getAniListAnime } from '@/providers/anilist/client';
import { decodeMediaRouteId, encodeMediaRouteId } from '@/types/provider';
import { animeDetailsHref } from '@/lib/routes';
/** Explicit catalog relationships only; never substitute another adaptation for a chapter. */
export function RelatedEditions({
  routeId,
  value,
  onSelect,
}: {
  routeId: string;
  value?: string;
  onSelect?: (id: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{
    routeId: string;
    choices: { value: string; label: string; detail?: string }[];
  } | null>(null);
  const choices = result?.routeId === routeId ? result.choices : [];
  useEffect(() => {
    let active = true;
    const ref = decodeMediaRouteId(routeId);
    if (ref?.providerId !== 'anilist-anime') return;
    const allowed = (
      edge: NonNullable<Awaited<ReturnType<typeof getAniListAnime>>['relations']>['edges'][number],
    ) =>
      edge.node.type === 'ANIME' &&
      ['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY'].includes(edge.relationType);
    getAniListAnime(ref.sourceId).then(
      async (media) => {
        const entries = new Map<string, { value: string; label: string; detail?: string }>();
        const add = (node: {
          id: number;
          title: { english?: string; romaji?: string; native?: string };
          format?: string;
        }) =>
          entries.set(String(node.id), {
            value: encodeMediaRouteId('anilist-anime', String(node.id)),
            label: node.title.english || node.title.romaji || 'Related series',
            detail: node.format?.replace(/_/g, ' '),
          });
        add(media);
        const neighbors = (media.relations?.edges ?? []).filter(allowed);
        neighbors.forEach((edge) => add(edge.node));
        if (active) setResult({ routeId, choices: [...entries.values()] });
        // A second hop joins seasons connected through their movie without guessing titles.
        await Promise.allSettled(
          neighbors.slice(0, 8).map(async (edge) => {
            const related = await getAniListAnime(String(edge.node.id));
            (related.relations?.edges ?? []).filter(allowed).forEach((item) => add(item.node));
          }),
        );
        if (active) setResult({ routeId, choices: [...entries.values()] });
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [routeId]);
  if (choices.length < 2) return null;
  return (
    <View>
      <Button label="Seasons, movies & series" variant="secondary" onPress={() => setOpen(true)} />
      <SelectionModal
        accentOptions
        visible={open}
        title="Seasons, movies & series"
        options={choices}
        value={value ?? routeId}
        onSelect={(selected) =>
          onSelect ? onSelect(selected) : router.replace(animeDetailsHref(selected))
        }
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
