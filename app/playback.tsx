import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ScrollView, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Button, Screen, Text } from '@/components/ui';
import { FindAnotherSourceButton } from '@/components/content/FindAnotherSourceButton';
import { apiRequest } from '@/services/api/client';
import { parseSubtitleCues, subtitleAt, type SubtitleCue } from '@/services/subtitleCues';
import { useMovieProgressStore } from '@/stores/movieProgressStore';
type Stream = {
  url: string;
  quality: string;
  contentType: 'hls' | 'progressive';
  headers?: Record<string, string>;
  providerName: string;
};
type Subtitle = { url: string; label: string; headers?: Record<string, string> };
type Payload = { streams: Stream[]; subtitles: Subtitle[] };
function MovieVideo({ payload, progressKey }: { payload: Payload; progressKey: string }) {
  const [selected, setSelected] = useState(0);
  const [caption, setCaption] = useState(-1);
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [captionError, setCaptionError] = useState('');
  const [time, setTime] = useState(0);
  const [error, setError] = useState('');
  const position = useRef(0);
  const resumed = useRef(false);
  const lastSaved = useRef(0);
  const stream = payload.streams[selected];
  const source = useMemo(
    () => ({ uri: stream.url, headers: stream.headers, contentType: stream.contentType }),
    [stream],
  );
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
  });
  useEffect(() => {
    position.current = useMovieProgressStore.getState().entries[progressKey]?.positionSeconds || 0;
  }, [progressKey]);
  useEffect(() => {
    const save = () => {
      if (player.duration > 0 && resumed.current)
        useMovieProgressStore.getState().save(progressKey, {
          positionSeconds: player.currentTime,
          durationSeconds: player.duration,
          updatedAt: Date.now(),
        });
    };
    const status = player.addListener('statusChange', ({ status, error: nativeError }) => {
      if (status === 'error')
        setError(
          nativeError?.message || 'This stream could not play. Choose another source or retry.',
        );
      if (status === 'readyToPlay' && !resumed.current) {
        resumed.current = true;
        if (position.current > 0 && position.current < player.duration - 5)
          player.currentTime = position.current;
        player.play();
      }
    });
    const tick = player.addListener('timeUpdate', ({ currentTime }) => {
      setTime(currentTime);
      if (Date.now() - lastSaved.current > 10000) {
        lastSaved.current = Date.now();
        save();
      }
    });
    const state = AppState.addEventListener('change', (s) => {
      if (s !== 'active') save();
    });
    return () => {
      save();
      status.remove();
      tick.remove();
      state.remove();
    };
  }, [player, progressKey]);
  useEffect(() => {
    if (caption < 0) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const sub = payload.subtitles[caption];
    fetch(sub.url, { signal: controller.signal, headers: sub.headers })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Subtitle HTTP ${r.status}`);
        if (Number(r.headers.get('content-length')) > 2000000)
          throw new Error('Subtitle too large.');
        return parseSubtitleCues(await r.text());
      })
      .then((value) => {
        if (!controller.signal.aborted) setCues(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCaptionError('This subtitle track could not load.');
      })
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [caption, payload]);
  return (
    <View className="gap-3">
      <View style={{ backgroundColor: 'black', aspectRatio: 16 / 9 }}>
        <VideoView
          player={player}
          nativeControls
          contentFit="contain"
          fullscreenOptions={{ enable: true }}
          style={{ width: '100%', height: '100%' }}
        />
        {caption >= 0 && subtitleAt(cues, time) ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', bottom: 42, left: 12, right: 12 }}
          >
            <Text style={{ textAlign: 'center', color: 'white', backgroundColor: '#000b' }}>
              {subtitleAt(cues, time)}
            </Text>
          </View>
        ) : null}
      </View>
      {error ? <Text>{error}</Text> : null}
      <Text variant="h3">Sources and quality</Text>
      <ScrollView horizontal>
        <View className="flex-row gap-2">
          {payload.streams.map((s, i) => (
            <Button
              key={i}
              size="sm"
              variant={selected === i ? 'primary' : 'secondary'}
              label={`${s.providerName} ? ${s.quality}`}
              onPress={() => {
                if (selected === i) return;
                position.current = player.currentTime;
                resumed.current = false;
                setError('');
                setSelected(i);
              }}
            />
          ))}
        </View>
      </ScrollView>
      <ScrollView horizontal>
        <View className="flex-row gap-2">
          <Button
            size="sm"
            label="Subtitles off"
            variant={caption === -1 ? 'primary' : 'secondary'}
            onPress={() => {
              setCaption(-1);
              setCues([]);
              setCaptionError('');
            }}
          />
          {payload.subtitles.map((s, i) => (
            <Button
              key={i}
              size="sm"
              label={s.label}
              variant={caption === i ? 'primary' : 'secondary'}
              onPress={() => {
                setCues([]);
                setCaptionError('');
                setCaption(i);
              }}
            />
          ))}
        </View>
      </ScrollView>
      {captionError ? <Text>{captionError}</Text> : null}
      {payload.subtitles.length ? (
        <Text tone="muted">
          External captions display here in windowed mode. Fullscreen captions depend on tracks
          embedded in the stream.
        </Text>
      ) : (
        <Text tone="muted">
          No external subtitle tracks supplied. Embedded tracks use the native player controls.
        </Text>
      )}
    </View>
  );
}
export default function MoviePlayerScreen() {
  const params = useLocalSearchParams<{
    mediaType?: string;
    tmdbId?: string;
    normalizedTitle?: string;
  }>();
  const router = useRouter();
  const type = params.mediaType;
  const id = params.tmdbId || '';
  const title = params.normalizedTitle || 'Movie / TV';
  const [season, setSeason] = useState('1');
  const [episode, setEpisode] = useState('1');
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<{ season: string; episode: string } | null>(null);
  const [state, setState] = useState<{ key: string; data?: Payload; error?: string } | null>(null);
  const valid = (type === 'movie' || type === 'tv') && /^[1-9][0-9]{0,19}$/.test(id);
  const key = `${type}:${id}:${selection?.season || ''}:${selection?.episode || ''}:${attempt}`;
  const progressKey = `tmdb:${type}:${id}:${type === 'tv' ? `s${selection?.season}e${selection?.episode}` : 'movie'}`;
  useEffect(() => {
    if (!valid || (type === 'tv' && !selection)) return;
    const controller = new AbortController();
    const query =
      type === 'tv'
        ? `?season=${encodeURIComponent(selection!.season)}&episode=${encodeURIComponent(selection!.episode)}`
        : '';
    apiRequest<Payload>(`/api/playback/${type}/${id}${query}`, { signal: controller.signal })
      .then((data) => {
        if (!data.streams?.length) throw new Error('No playable sources returned.');
        if (!controller.signal.aborted) setState({ key, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            key,
            error: error instanceof Error ? error.message : 'Playback unavailable.',
          });
      });
    return () => controller.abort();
  }, [valid, type, id, key, selection]);
  const current = state?.key === key ? state : null;
  return (
    <Screen scrollable>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="gap-4 p-4">
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
        <Text variant="h2">{title}</Text>
        {type === 'tv' ? (
          <View className="gap-2">
            <Text>Choose season and episode</Text>
            <View className="flex-row gap-3">
              <TextInput
                accessibilityLabel="Season"
                keyboardType="number-pad"
                value={season}
                onChangeText={setSeason}
                className="min-w-20 rounded-lg bg-neutral-200 p-3 text-neutral-950"
              />
              <TextInput
                accessibilityLabel="Episode"
                keyboardType="number-pad"
                value={episode}
                onChangeText={setEpisode}
                className="min-w-20 rounded-lg bg-neutral-200 p-3 text-neutral-950"
              />
              <Button label="Play" onPress={() => setSelection({ season, episode })} />
            </View>
          </View>
        ) : null}
        {!valid ? (
          <Text>Invalid movie or TV identifier.</Text>
        ) : type === 'tv' && !selection ? (
          <Text tone="muted">Select the episode you want to watch.</Text>
        ) : current?.data ? (
          <View className="gap-3">
            <MovieVideo key={key} payload={current.data} progressKey={progressKey} />
            <Button
              label="Refresh sources"
              variant="secondary"
              onPress={() => setAttempt((x) => x + 1)}
            />
            <FindAnotherSourceButton routeId={`tmdb:${type}:${id}`} title={title} />
          </View>
        ) : current?.error ? (
          <View className="gap-3">
            <Text>{current.error}</Text>
            <Button label="Retry playback" onPress={() => setAttempt((x) => x + 1)} />
            <FindAnotherSourceButton routeId={`tmdb:${type}:${id}`} title={title} />
          </View>
        ) : (
          <Text>Finding playback sources...</Text>
        )}
      </View>
    </Screen>
  );
}
