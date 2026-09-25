import { SourceWebsiteButton } from '@/components/content/SourceWebsiteButton';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView, type SubtitleTrack } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Text } from '@/components/ui';
import {
  getProviderDisplayName,
  resolveAnimePlayback,
  type ResolvedAnimePlaybackResult,
} from '@/services/contentService';
import { useAnimeProgressStore } from '@/stores/animeProgressStore';

export default function AnimePlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, episodeId } = useLocalSearchParams<{ id: string; episodeId: string }>();
  const setEpisodeProgress = useAnimeProgressStore((state) => state.setEpisodeProgress);
  // Snapshot resume once per selected episode, never from live progress writes.
  const resumeSeconds = useMemo(() => id && episodeId
    ? useAnimeProgressStore.getState().getEpisodeProgress(id, episodeId)?.positionSeconds ?? 0 : 0,
    [id, episodeId]);
  const videoViewRef = useRef<VideoView>(null);
  const fullscreenSourceRef = useRef('');
  const [subtitleLabel, setSubtitleLabel] = useState('Checking English subtitles...');
  const resumedSourceRef = useRef<string | null>(null);
  const lastSavedAtRef = useRef(0);
  const latestTimeRef = useRef(0);

  const [useDirectStream,setUseDirectStream] = useState(false);
  const [playback, setPlayback] = useState<ResolvedAnimePlaybackResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [playerStatus, setPlayerStatus] = useState('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !episodeId) {
      setLoading(false);
      setError('Missing anime or episode id.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPlayback(null);
    setUseDirectStream(false);

    resolveAnimePlayback(id, episodeId)
      .then((resolved) => {
        if (cancelled) return;
        setPlayback(resolved);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to resolve playback for this episode.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, episodeId, retry]);

  const saveProgress = useCallback(
    (positionSeconds: number, durationSeconds: number) => {
      if (!id || !episodeId || !playback || durationSeconds <= 0) {
        return;
      }

      setEpisodeProgress({
        animeId: id,
        episodeId,
        episodeNumber: playback.episodeNumber,
        episodeTitle: playback.episodeTitle,
        positionSeconds,
        durationSeconds,
        updatedAt: Date.now(),
      });
    },
    [id, episodeId, playback, setEpisodeProgress],
  );

  const streamUrl = (useDirectStream ? playback?.source.fallbackUrl : playback?.source.url) ?? '';

  const videoSource = useMemo(() => streamUrl ? { uri: streamUrl, contentType: playback?.source.contentType ?? 'auto' as const } : null, [streamUrl, playback?.source.contentType]);

  const player = useVideoPlayer(videoSource, (instance) => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 1;

  });

  const enterFullscreen = useCallback(async () => {
    if (!streamUrl || !videoViewRef.current || fullscreenSourceRef.current === streamUrl) return;
    fullscreenSourceRef.current = streamUrl;
    try { await videoViewRef.current.enterFullscreen(); } catch { fullscreenSourceRef.current = ''; }
  }, [streamUrl]);

  useEffect(() => {
    if (!streamUrl) return;
    setSubtitleLabel('Checking English subtitles...');
    const selectEnglish = (tracks: SubtitleTrack[]) => {
      const english = tracks.find(track => /^en(?:g|[-_].*)?$/i.test(track.language ?? '') || /english/i.test(track.label ?? ''));
      if (english) player.subtitleTrack = english;
      setSubtitleLabel(english ? 'English subtitles enabled' : 'No English subtitle track supplied by this stream');
    };
    if (player.availableSubtitleTracks?.length) selectEnglish(player.availableSubtitleTracks);
    const tracksSub = player.addListener('availableSubtitleTracksChange', ({availableSubtitleTracks}) => selectEnglish(availableSubtitleTracks));
    const loadSub = player.addListener('sourceLoad', ({availableSubtitleTracks}) => selectEnglish(availableSubtitleTracks));
    return () => {tracksSub.remove();loadSub.remove();};
  }, [player, streamUrl]);

  useEffect(() => {
    if (!player || !streamUrl) {
      return;
    }

    const resumeKey = id + ':' + episodeId + ':' + streamUrl;
    const resumeOnce = () => {
      if (resumedSourceRef.current === resumeKey) return;
      resumedSourceRef.current = resumeKey;
      if (resumeSeconds > 0) player.currentTime = resumeSeconds;
    };

    const statusSub = player.addListener('statusChange', ({ status, error: nativeError }) => {
      setPlayerStatus(status);
      if (status === 'error') {
        setError('The player could not load this stream. Retry or open the source website.');
        if (__DEV__) console.warn('[player]', {status, providerId:playback?.source.providerId, error: nativeError ? 'Native playback error' : 'Unknown playback error'});
      }
      if (status === 'readyToPlay') resumeOnce();
    });

    if (player.status === 'readyToPlay') resumeOnce();

    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      latestTimeRef.current = currentTime;
      const duration = player.duration || playback?.durationSeconds || 0;
      const now = Date.now();

      if (now - lastSavedAtRef.current < 2000) {
        return;
      }

      lastSavedAtRef.current = now;
      saveProgress(currentTime, duration);
    });

    return () => {
      statusSub.remove();
      timeSub.remove();
    };
  }, [player, streamUrl, playback?.durationSeconds, resumeSeconds, saveProgress, id, episodeId]);

  useEffect(() => {
    return () => {
      const duration = playback?.durationSeconds || 0;
      saveProgress(latestTimeRef.current, duration);
    };
  }, [playback?.durationSeconds, saveProgress]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-neutral-950 px-6">
        <Stack.Screen options={{ headerShown: true, title: 'Player' }} />
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-center text-neutral-300">Resolving playback source...</Text>
      </View>
    );
  }

  if (error || !playback) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-neutral-950 px-6">
        <Stack.Screen options={{ headerShown: true, title: 'Player' }} />
        <Text className="text-center text-white">Unable to play this episode</Text>
        <Text className="text-center text-neutral-400">
          {error ?? 'No playback source was resolved.'}
        </Text>
        <Pressable onPress={() => {resumedSourceRef.current=null;setRetry(value=>value+1);}} className="mt-2"><Text tone="primary">Retry playback</Text></Pressable>
        {playback?.source.fallbackUrl && !useDirectStream ? <Pressable onPress={() => {setUseDirectStream(true);setError(null);}}><Text tone="primary">Play original stream without external subtitles</Text></Pressable> : null}
        <SourceWebsiteButton routeId={id} />
        <Pressable onPress={() => router.back()} className="mt-2">
          <Text tone="primary">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const providerLabel = getProviderDisplayName(playback.source.providerId);
  const caption = playback.isOffline
    ? 'Playing from downloaded offline storage.'
    : playback.source.isDemo || playback.source.availability === 'demo'
      ? playback.source.note ??
        'Demo sample stream for development only — not licensed anime content.'
      : playback.source.note ?? `Streaming via ${providerLabel}.`;

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top }} className="absolute left-0 right-0 top-0 z-10 px-4">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="self-start rounded-full bg-black/50 px-3 py-2"
        >
          <Text className="text-white">Back</Text>
        </Pressable>
      </View>

      {playerStatus === 'loading' ? <Text className="px-4 py-2 text-white">Buffering stream...</Text> : null}
      <VideoView
        ref={videoViewRef}
        onFirstFrameRender={() => { void enterFullscreen(); }}
        onFullscreenExit={() => { latestTimeRef.current=player.currentTime; saveProgress(player.currentTime,player.duration || playback.durationSeconds || 0); }}
        fullscreenOptions={{ enable: true, orientation: 'landscape' }}
        player={player}
        style={{ width: '100%', aspectRatio: 16 / 9 }}
        contentFit="contain"
        nativeControls
      />

      <View className="gap-2 px-4 py-4">
        <Text variant="caption" className="text-neutral-300">{subtitleLabel}</Text>
        <Pressable onPress={() => { fullscreenSourceRef.current=''; void enterFullscreen(); }}><Text tone="primary">Fullscreen</Text></Pressable>
        <SourceWebsiteButton routeId={playback.source.providerId} />
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="h3" className="flex-1 text-white">
            {playback.animeTitle}
          </Text>
          {playback.isOffline ? <Badge label="Offline Playback" variant="secondary" /> : null}
          {!playback.isOffline && (playback.source.isDemo || playback.source.availability === 'demo') ? (
            <Badge label="Demo Stream" variant="secondary" />
          ) : null}
        </View>
        <Text variant="body" className="text-neutral-300">
          Episode {playback.episodeNumber}: {playback.episodeTitle}
        </Text>
        <Text variant="caption" className="text-neutral-400">
          {caption}
        </Text>
        {!playback.isOffline && !playback.source.isDemo ? (
          <Text variant="caption" className="text-neutral-500">
            Source: {providerLabel}
            {playback.source.quality ? ` · ${playback.source.quality}` : ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
