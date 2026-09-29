import { useMediaBookmarkStore } from '@/stores/mediaBookmarkStore';
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
  const { id, episodeId, seconds } = useLocalSearchParams<{
    id: string;
    episodeId: string;
    seconds?: string;
  }>();
  const saveBookmark = useMediaBookmarkStore((state) => state.save);
  const setEpisodeProgress = useAnimeProgressStore((state) => state.setEpisodeProgress);
  // Snapshot resume once per selected episode, never from live progress writes.
  const resumeSeconds = useMemo(
    () =>
      seconds !== undefined && Number.isFinite(Number(seconds))
        ? Math.max(0, Number(seconds))
        : id && episodeId
          ? (useAnimeProgressStore.getState().getEpisodeProgress(id, episodeId)?.positionSeconds ??
            0)
          : 0,
    [id, episodeId, seconds],
  );
  const videoViewRef = useRef<VideoView>(null);
  const fullscreenSourceRef = useRef('');
  const fullscreenActiveRef = useRef(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [frameSource, setFrameSource] = useState('');
  const readyFrameRef = useRef('');
  const [bookmarkMessage, setBookmarkMessage] = useState('Save this moment');
  const [subtitleLabel, setSubtitleLabel] = useState('Checking English subtitles...');
  const resumedSourceRef = useRef<string | null>(null);
  const fallbackPositionRef = useRef<number | null>(null);
  const fallbackAttemptedRef = useRef(false);
  const lastSavedAtRef = useRef(0);
  const latestTimeRef = useRef(0);

  const [qualityUrl, setQualityUrl] = useState<string | null>(null);
  const [useDirectStream, setUseDirectStream] = useState(false);
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
    setQualityUrl(null);
    setFrameSource('');
    readyFrameRef.current = '';
    fullscreenSourceRef.current = '';
    setBookmarkMessage('Save this moment');
    fallbackPositionRef.current = null;
    fallbackAttemptedRef.current = false;

    resolveAnimePlayback(id, episodeId)
      .then((resolved) => {
        if (cancelled) return;
        setPlayback(resolved);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'Unable to resolve playback for this episode.',
        );
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

  const streamUrl =
    (useDirectStream ? playback?.source.fallbackUrl : (qualityUrl ?? playback?.source.url)) ?? '';

  useEffect(() => {
    readyFrameRef.current = '';
    setFrameSource('');
  }, [streamUrl]);

  const videoSource = useMemo(
    () =>
      streamUrl
        ? { uri: streamUrl, contentType: playback?.source.contentType ?? ('auto' as const) }
        : null,
    [streamUrl, playback?.source.contentType],
  );

  const player = useVideoPlayer(videoSource, (instance) => {
    instance.loop = false;
    instance.bufferOptions = {
      preferredForwardBufferDuration: 45,
      minBufferForPlayback: 2,
      maxBufferBytes: 64 * 1024 * 1024,
      prioritizeTimeOverSizeThreshold: true,
    };
    instance.timeUpdateEventInterval = 1;
  });

  const fallbackToVideo = useCallback(() => {
    if (!playback?.source.fallbackUrl || fallbackAttemptedRef.current) return false;
    fallbackAttemptedRef.current = true;
    fallbackPositionRef.current = Math.max(
      resumeSeconds,
      latestTimeRef.current,
      player.currentTime || 0,
    );
    setError(null);
    setUseDirectStream(true);
    return true;
  }, [playback?.source.fallbackUrl, player, resumeSeconds]);

  // A subtitle gateway outage must not hold the original video indefinitely.
  useEffect(() => {
    if (!streamUrl || useDirectStream || !playback?.source.fallbackUrl) return;
    const timer = setTimeout(() => {
      if (player.status !== 'readyToPlay') fallbackToVideo();
    }, 15000);
    return () => clearTimeout(timer);
  }, [streamUrl, useDirectStream, playback?.source.fallbackUrl, player, fallbackToVideo]);

  const enterFullscreen = useCallback(async () => {
    if (
      !streamUrl ||
      readyFrameRef.current !== streamUrl ||
      !videoViewRef.current ||
      fullscreenSourceRef.current === streamUrl
    )
      return;
    fullscreenSourceRef.current = streamUrl;
    if (fullscreenActiveRef.current) return;
    try {
      await videoViewRef.current.enterFullscreen();
    } catch {
      fullscreenSourceRef.current = '';
    }
  }, [streamUrl]);

  useEffect(() => {
    if (!streamUrl) return;
    setSubtitleLabel('Checking English subtitles...');
    const selectEnglish = (tracks: SubtitleTrack[]) => {
      const english = tracks.find(
        (track) =>
          /^en(?:g|[-_].*)?$/i.test(track.language ?? '') || /english/i.test(track.label ?? ''),
      );
      player.subtitleTrack = subtitlesEnabled ? (english ?? null) : null;
      setSubtitleLabel(
        !subtitlesEnabled
          ? 'Subtitle tracks off. Captions embedded in the picture remain visible.'
          : english
            ? 'English subtitles on'
            : 'No selectable English track. This video may have captions embedded in the picture.',
      );
    };
    selectEnglish(player.availableSubtitleTracks ?? []);
    const tracksSub = player.addListener(
      'availableSubtitleTracksChange',
      ({ availableSubtitleTracks }) => selectEnglish(availableSubtitleTracks),
    );
    const loadSub = player.addListener('sourceLoad', ({ availableSubtitleTracks }) =>
      selectEnglish(availableSubtitleTracks),
    );
    return () => {
      tracksSub.remove();
      loadSub.remove();
    };
  }, [player, streamUrl, useDirectStream, subtitlesEnabled]);

  useEffect(() => {
    if (!player || !streamUrl) {
      return;
    }

    const resumeKey = id + ':' + episodeId + ':' + streamUrl;
    const resumeOnce = () => {
      if (resumedSourceRef.current === resumeKey) return;
      resumedSourceRef.current = resumeKey;
      const position = fallbackPositionRef.current ?? resumeSeconds;
      if (position > 0) player.currentTime = position;
      player.play();
    };

    const statusSub = player.addListener('statusChange', ({ status, error: nativeError }) => {
      setPlayerStatus(status);
      if (status === 'error') {
        if (fallbackToVideo()) return;
        setError('The player could not load this stream. Retry or open the source website.');
        if (__DEV__)
          console.warn('[player]', {
            status,
            providerId: playback?.source.providerId,
            error:
              nativeError?.message?.replace(/https?:\/\/\S+/g, '[stream URL]').slice(0, 240) ||
              'Unknown playback error',
          });
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
  }, [
    player,
    streamUrl,
    playback?.durationSeconds,
    resumeSeconds,
    saveProgress,
    id,
    episodeId,
    fallbackToVideo,
  ]);

  useEffect(() => {
    return () => {
      const duration = playback?.durationSeconds || 0;
      saveProgress(latestTimeRef.current, duration);
    };
  }, [playback?.durationSeconds, saveProgress]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-neutral-950 px-6">
        <Stack.Screen options={{ headerShown: true, title: 'Watch episode' }} />
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-center text-neutral-300">Resolving playback source...</Text>
      </View>
    );
  }

  if (error || !playback) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-neutral-950 px-6">
        <Stack.Screen options={{ headerShown: true, title: 'Watch episode' }} />
        <Text className="text-center text-white">Unable to play this episode</Text>
        <Text className="text-center text-neutral-400">
          {error ?? 'No playback source was resolved.'}
        </Text>
        <Pressable
          onPress={() => {
            resumedSourceRef.current = null;
            setRetry((value) => value + 1);
          }}
          className="mt-2"
        >
          <Text tone="primary">Retry playback</Text>
        </Pressable>
        {playback?.source.fallbackUrl && !useDirectStream ? (
          <Pressable onPress={fallbackToVideo}>
            <Text tone="primary">Play original stream without external subtitles</Text>
          </Pressable>
        ) : null}
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
      ? (playback.source.note ??
        'Demo sample stream for development only — not licensed anime content.')
      : (playback.source.note ?? `Streaming via ${providerLabel}.`);

  return (
    <View
      className="flex-1 bg-black"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="px-4 py-2">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="self-start rounded-full bg-black/50 px-3 py-2"
        >
          <Text className="text-white">Back</Text>
        </Pressable>
      </View>

      {playerStatus === 'loading' ? (
        <Text className="px-4 py-2 text-white">Buffering stream...</Text>
      ) : null}
      {!useDirectStream && playback.source.qualityOptions ? (
        <View className="flex-row gap-3 px-4 py-2">
          {playback.source.qualityOptions.map((option) => (
            <Pressable
              key={option.url}
              onPress={() => {
                fallbackPositionRef.current = player.currentTime;
                setQualityUrl(option.url);
              }}
            >
              <Badge
                label={option.label}
                variant={streamUrl === option.url ? 'primary' : 'secondary'}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
      <VideoView
        ref={videoViewRef}
        onFirstFrameRender={() => {
          readyFrameRef.current = streamUrl;
          setFrameSource(streamUrl);
          void enterFullscreen();
        }}
        onFullscreenEnter={() => {
          fullscreenActiveRef.current = true;
        }}
        onFullscreenExit={() => {
          fullscreenActiveRef.current = false;
          latestTimeRef.current = player.currentTime;
          saveProgress(player.currentTime, player.duration || playback.durationSeconds || 0);
        }}
        fullscreenOptions={{ enable: frameSource === streamUrl, orientation: 'landscape' }}
        player={player}
        style={{ width: '100%', aspectRatio: 16 / 9 }}
        contentFit="contain"
        nativeControls
      />

      <View className="gap-2 px-4 py-4">
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            saveBookmark({
              kind: 'anime',
              mediaId: id,
              unitId: episodeId,
              unitTitle: playback.episodeTitle,
              position: player.currentTime,
            });
            setBookmarkMessage('Moment saved to Bookmarks');
          }}
        >
          <Text tone="primary">{bookmarkMessage}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: subtitlesEnabled }}
          onPress={() => setSubtitlesEnabled((value) => !value)}
        >
          <Text tone="primary">Subtitles: {subtitlesEnabled ? 'On' : 'Off'}</Text>
        </Pressable>
        <Text variant="caption" className="text-neutral-300">
          {subtitleLabel}
        </Text>
        <Pressable
          disabled={frameSource !== streamUrl}
          accessibilityState={{ disabled: frameSource !== streamUrl }}
          onPress={() => {
            fullscreenSourceRef.current = '';
            void enterFullscreen();
          }}
        >
          <Text tone="primary">
            {frameSource === streamUrl ? 'Fullscreen' : 'Fullscreen available when video is ready'}
          </Text>
        </Pressable>
        <SourceWebsiteButton routeId={playback.source.providerId} />
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="h3" className="flex-1 text-white">
            {playback.animeTitle}
          </Text>
          {playback.isOffline ? <Badge label="Offline Playback" variant="secondary" /> : null}
          {!playback.isOffline &&
          (playback.source.isDemo || playback.source.availability === 'demo') ? (
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
