import { SourceWebsiteButton } from '@/components/content/SourceWebsiteButton';
import { parseSubtitleCues, subtitleAt, type SubtitleCue } from '@/services/subtitleCues';
import { useMediaBookmarkStore } from '@/stores/mediaBookmarkStore';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView, type SubtitleTrack } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Pressable, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Text } from '@/components/ui';
import { animeDetailsHref } from '@/lib/routes';
import {
    getProviderDisplayName,
    resolveAnimePlayback,
    type ResolvedAnimePlaybackResult,
} from '@/services/contentService';
import { useAnimeProgressStore } from '@/stores/animeProgressStore';
import { useSubtitlePreferencesStore } from '@/stores/subtitlePreferencesStore';

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
  const [fullscreen, setFullscreen] = useState(false);
  // overlayVisible: the one authoritative state for ALL custom controls
  const [overlayVisible, setOverlayVisible] = useState(true);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [externalCues, setExternalCues] = useState<SubtitleCue[]>([]);
  const [externalError, setExternalError] = useState('');
  const [playhead, setPlayhead] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [frameSource, setFrameSource] = useState('');
  const readyFrameRef = useRef('');
  const [bookmarkToastVisible, setBookmarkToastVisible] = useState(false);
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
  const [resolveRetryCount, setResolveRetryCount] = useState(0);
  const [playerStatus, setPlayerStatus] = useState('idle');
  const [error, setError] = useState<string | null>(null);
  const subtitlePrefs = useSubtitlePreferencesStore();

  // Animated opacity for the controls overlay — fades in/out smoothly.
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  /** Show controls and restart the auto-hide timer. */
  const showControls = useCallback(() => {
    setOverlayVisible(true);
    setSettingsOpen(false);
    Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
        () => {
          setOverlayVisible(false);
          setSettingsOpen(false);
        },
      );
    }, 4000);
  }, [overlayOpacity]);

  /** Toggle controls. Tapping while visible hides immediately; tap while hidden shows. */
  const toggleControls = useCallback(() => {
    setOverlayVisible((v) => {
      if (v) {
        if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
        setSettingsOpen(false);
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
          () => {
            setOverlayVisible(false);
          },
        );
        return true; // keep true until fade completes; setOverlayVisible(false) fires in callback
      }
      showControls();
      return true;
    });
  }, [showControls, overlayOpacity]);

  useEffect(
    () => () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    },
    [],
  );

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
    setBookmarkToastVisible(false);
    setPlayhead(0);
    latestTimeRef.current = 0;
    fallbackPositionRef.current = null;
    fallbackAttemptedRef.current = false;
    setResolveRetryCount(0);
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
      if (!id || !episodeId || !playback || durationSeconds <= 0) return;
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
    instance.timeUpdateEventInterval = 0.25;
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

  const retryResolvePlayback = useCallback(() => {
    if (resolveRetryCount >= 2) return false;
    setResolveRetryCount((prev) => prev + 1);
    setRetry((prev) => prev + 1);
    fallbackPositionRef.current = Math.max(
      resumeSeconds,
      latestTimeRef.current,
      player.currentTime || 0,
    );
    setError(null);
    return true;
  }, [resolveRetryCount, resumeSeconds]);

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
      fullscreenSourceRef.current === streamUrl
    )
      return;
    fullscreenSourceRef.current = streamUrl;
    setFullscreen(true);
    showControls();
  }, [streamUrl, showControls]);

  const leaveFullscreen = useCallback(() => {
    setFullscreen(false);
    setSettingsOpen(false);
    setOverlayVisible(true);
    Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    latestTimeRef.current = player.currentTime;
    saveProgress(player.currentTime, player.duration || playback?.durationSeconds || 0);
  }, [player, playback?.durationSeconds, saveProgress, overlayOpacity]);

  useEffect(() => {
    if (!fullscreen) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      leaveFullscreen();
      return true;
    });
    return () => listener.remove();
  }, [fullscreen, leaveFullscreen]);

  const handleBack = useCallback(() => {
    if (fullscreen) {
      leaveFullscreen();
      return;
    }
    if (router.canGoBack()) router.back();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else router.replace(animeDetailsHref(id) as any);
  }, [router, id, fullscreen, leaveFullscreen]);

  const englishUrl = playback?.source.subtitles?.find((track) =>
    /^en(?:g|[-_].*)?$/i.test(track.language),
  )?.url;
  useEffect(() => {
    setExternalCues([]);
    setExternalError('');
    if (!englishUrl) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      setExternalError('English captions timed out. Video can continue.');
    }, 15000);
    fetch(englishUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error('English captions unavailable (' + response.status + ').');
        const cues = parseSubtitleCues(await response.text());
        if (!cues.length) throw new Error('No readable English caption cues.');
        if (!controller.signal.aborted) setExternalCues(cues);
      })
      .catch(() => {
        if (!controller.signal.aborted) setExternalError('English captions could not be loaded.');
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [englishUrl]);

  useEffect(() => {
    if (!streamUrl) return;
    setSubtitleLabel('Checking English subtitles...');
    const selectEnglish = (tracks: SubtitleTrack[]) => {
      const english = tracks.find(
        (track) =>
          /^en(?:g|[-_].*)?$/i.test(track.language ?? '') || /english/i.test(track.label ?? ''),
      );
      player.subtitleTrack = subtitlesEnabled && !externalCues.length ? (english ?? null) : null;
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
  }, [player, streamUrl, useDirectStream, subtitlesEnabled, externalCues.length]);

  useEffect(() => {
    if (!player || !streamUrl) return;
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
      if (status === 'readyToPlay') {
        setIsPlaying(true);
        resumeOnce();
      }
      if (status === 'error') {
        setIsPlaying(false);
        const errorMessage = nativeError?.message || '';
        const is404OrSourceError =
          errorMessage.includes('404') || errorMessage.includes('Source error');
        if (is404OrSourceError) {
          if (!useDirectStream && fallbackToVideo()) {
            if (__DEV__) console.warn('[player] 404/source error — falling back to direct stream');
            return;
          }
          if (retryResolvePlayback()) {
            if (__DEV__) console.warn('[player] Retrying playback resolution');
            return;
          }
        }
        if (fallbackToVideo()) return;
        setError('The player could not load this stream. Retry or open the source website.');
        if (__DEV__)
          console.warn('[player]', {
            status,
            providerId: playback?.source.providerId,
            error:
              nativeError?.message?.replace(/https?:\/\/\S+/g, '[stream URL]').slice(0, 240) ||
              'Unknown',
          });
      }
    });
    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      latestTimeRef.current = currentTime;
      setPlayhead(currentTime);
      const dur = player.duration || playback?.durationSeconds || 0;
      setDuration(dur);
      const now = Date.now();
      if (now - lastSavedAtRef.current < 2000) return;
      lastSavedAtRef.current = now;
      saveProgress(currentTime, dur);
    });
    if (player.status === 'readyToPlay') resumeOnce();
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
    retryResolvePlayback,
    useDirectStream,
  ]);

  useEffect(
    () => () => {
      const dur = playback?.durationSeconds || 0;
      saveProgress(latestTimeRef.current, dur);
    },
    [playback?.durationSeconds, saveProgress],
  );

  const saveCurrentBookmark = useCallback(() => {
    if (!playback) return;
    saveBookmark({
      kind: 'anime',
      mediaId: id,
      unitId: episodeId,
      unitTitle: playback.episodeTitle,
      position: player.currentTime,
      previewUri: playback.episodeThumbnailUrl ?? undefined,
    });
    setBookmarkToastVisible(true);
    setTimeout(() => setBookmarkToastVisible(false), 2000);
  }, [saveBookmark, id, episodeId, playback, player]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60),
      sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-neutral-950 px-6">
        <Stack.Screen
          options={{
            headerShown: false,
            title: 'Watch episode',
            orientation: 'portrait',
            statusBarHidden: false,
          }}
        />
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-center text-neutral-300">Resolving playback source...</Text>
      </View>
    );
  }

  if (error || !playback) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-neutral-950 px-6">
        <Stack.Screen options={{ headerShown: false, title: 'Watch episode' }} />
        <Text className="text-center text-white">Unable to play this episode</Text>
        <Text className="text-center text-neutral-400">
          {error ?? 'No playback source was resolved.'}
        </Text>
        <Pressable
          onPress={() => {
            resumedSourceRef.current = null;
            setRetry((v) => v + 1);
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
        <Pressable onPress={handleBack} className="mt-2">
          <Text tone="primary">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const providerLabel = getProviderDisplayName(playback.source.providerId);
  const activeSubtitleText =
    subtitlesEnabled && externalCues.length > 0 ? subtitleAt(externalCues, playhead) : '';
  const totalDuration = duration || playback.durationSeconds || 0;
  const progressFraction = totalDuration > 0 ? Math.min(1, playhead / totalDuration) : 0;

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: fullscreen ? 0 : insets.top }}>
      <Stack.Screen
        options={{
          headerShown: false,
          orientation: fullscreen ? 'landscape' : 'portrait',
          statusBarHidden: fullscreen,
        }}
      />

      {/* Back button — non-fullscreen, outside video */}
      {!fullscreen ? (
        <View className="px-4 py-2">
          <Pressable
            accessibilityRole="button"
            onPress={handleBack}
            className="self-start rounded-full bg-neutral-800 px-3 py-2"
          >
            <Text className="text-white">← Back</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Video container — tap to toggle controls */}
      <Pressable
        accessible={false}
        onPress={toggleControls}
        style={fullscreen ? { flex: 1 } : { width: '100%', aspectRatio: 16 / 9 }}
      >
        <VideoView
          ref={videoViewRef}
          onFirstFrameRender={() => {
            readyFrameRef.current = streamUrl;
            setFrameSource(streamUrl);
            void enterFullscreen();
          }}
          fullscreenOptions={{ enable: false }}
          player={player}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          nativeControls={false}
        />

        {/* External subtitle overlay */}
        {activeSubtitleText ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: overlayVisible ? 72 : 16,
              left: 20,
              right: 20,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: subtitlePrefs.color,
                fontSize: fullscreen ? subtitlePrefs.fontSize + 4 : subtitlePrefs.fontSize,
                textShadowColor: subtitlePrefs.outline ? 'rgba(0,0,0,0.9)' : 'transparent',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: subtitlePrefs.outline ? 3 : 0,
                backgroundColor: subtitlePrefs.background
                  ? `rgba(0,0,0,${subtitlePrefs.backgroundOpacity})`
                  : 'transparent',
                paddingHorizontal: subtitlePrefs.background ? 6 : 0,
                paddingVertical: subtitlePrefs.background ? 2 : 0,
                borderRadius: 4,
                textAlign: 'center',
                lineHeight:
                  (fullscreen ? subtitlePrefs.fontSize + 4 : subtitlePrefs.fontSize) * 1.4,
              }}
            >
              {activeSubtitleText}
            </Text>
          </View>
        ) : null}

        {/* Controls overlay — fades in/out with overlayVisible */}
        {overlayVisible ? (
          <Animated.View
            style={{
              position: 'absolute',
              inset: 0,
              justifyContent: 'space-between',
              opacity: overlayOpacity,
            }}
            pointerEvents="box-none"
          >
            {/* Top bar: back (fullscreen) + Bookmark + Settings */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 12,
                paddingTop: 8,
                backgroundColor: 'rgba(0,0,0,0.4)',
              }}
            >
              {fullscreen ? (
                <Pressable
                  onPress={leaveFullscreen}
                  accessibilityRole="button"
                  className="rounded-full bg-black/60 px-3 py-2"
                >
                  <Text className="text-sm text-white">← Back</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  label="Bookmark Moment"
                  size="sm"
                  variant="secondary"
                  onPress={saveCurrentBookmark}
                />
                <Button
                  label="Settings"
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    setSettingsOpen((v) => !v);
                    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
                  }}
                />
              </View>
            </View>

            {/* Center: play/pause */}
            <View style={{ alignItems: 'center' }}>
              <Pressable
                onPress={() => {
                  if (player.playing) {
                    player.pause();
                    setIsPlaying(false);
                  } else {
                    player.play();
                    setIsPlaying(true);
                  }
                  showControls();
                }}
                className="rounded-full bg-black/60 p-4"
              >
                {/* Play/pause icons — transparent style, no emoji */}
                {isPlaying ? (
                  // Pause: two vertical white bars
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 5,
                        height: 22,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        borderRadius: 2,
                      }}
                    />
                    <View
                      style={{
                        width: 5,
                        height: 22,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        borderRadius: 2,
                      }}
                    />
                  </View>
                ) : (
                  // Play: right-pointing triangle
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: 0,
                        height: 0,
                        borderTopWidth: 12,
                        borderBottomWidth: 12,
                        borderLeftWidth: 22,
                        borderTopColor: 'transparent',
                        borderBottomColor: 'transparent',
                        borderLeftColor: 'rgba(255,255,255,0.9)',
                        marginLeft: 4,
                      }}
                    />
                  </View>
                )}
              </Pressable>
            </View>

            {/* Bottom bar: time + scrubber + fullscreen icon */}
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.5)',
                paddingHorizontal: 12,
                paddingBottom: 10,
                paddingTop: 6,
                gap: 4,
              }}
            >
              {/* Progress bar */}
              <View
                style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${progressFraction * 100}%`,
                    backgroundColor: '#6366f1',
                    borderRadius: 2,
                  }}
                />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>
                  {formatTime(playhead)} / {formatTime(totalDuration)}
                </Text>
                {/* Fullscreen toggle */}
                <Pressable
                  onPress={() => {
                    if (fullscreen) leaveFullscreen();
                    else {
                      fullscreenSourceRef.current = '';
                      void enterFullscreen();
                    }
                  }}
                  className="rounded px-2 py-1"
                >
                  <Text style={{ color: 'white', fontSize: 16 }}>{fullscreen ? '✕' : '⤢'}</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {/* Bookmark toast — always visible briefly */}
        {bookmarkToastVisible ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 48, right: 8, zIndex: 20 }}
            className="rounded-lg bg-black/80 px-3 py-2"
          >
            <Text className="text-xs text-white">Moment bookmarked</Text>
          </View>
        ) : null}

        {/* Settings panel — shown above everything, not gated by overlayVisible */}
        {settingsOpen ? (
          <View
            style={{
              position: 'absolute',
              top: 48,
              right: 8,
              maxHeight: 320,
              width: 280,
              backgroundColor: '#171717',
              borderRadius: 16,
              padding: 12,
              zIndex: 100,
              elevation: 100,
            }}
          >
            <Button
              label={'Subtitles: ' + (subtitlesEnabled ? 'On' : 'Off')}
              variant="secondary"
              size="sm"
              onPress={() => setSubtitlesEnabled((v) => !v)}
            />
            {subtitlesEnabled ? (
              <>
                <Text className="mb-1 mt-3 text-xs font-semibold text-neutral-400">
                  Caption Size
                </Text>
                <View className="flex-row gap-1.5">
                  {([14, 16, 18, 20, 24] as const).map((size) => (
                    <Pressable
                      key={size}
                      onPress={() => subtitlePrefs.update({ fontSize: size })}
                      className={
                        subtitlePrefs.fontSize === size
                          ? 'rounded bg-primary-600 px-2 py-1'
                          : 'rounded bg-neutral-800 px-2 py-1'
                      }
                    >
                      <Text className="text-[10px] text-white">{size}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text className="mb-1 mt-3 text-xs font-semibold text-neutral-400">
                  Caption Color
                </Text>
                <View className="flex-row gap-2">
                  {(['white', 'yellow'] as const).map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => subtitlePrefs.update({ color })}
                      className={
                        subtitlePrefs.color === color
                          ? 'rounded bg-primary-600 px-3 py-1'
                          : 'rounded bg-neutral-800 px-3 py-1'
                      }
                    >
                      <Text className="text-xs capitalize text-white">{color}</Text>
                    </Pressable>
                  ))}
                </View>
                <View className="mt-2">
                  <Pressable
                    onPress={() => subtitlePrefs.update({ background: !subtitlePrefs.background })}
                    className={
                      subtitlePrefs.background
                        ? 'rounded bg-primary-600 px-3 py-1'
                        : 'rounded bg-neutral-800 px-3 py-1'
                    }
                  >
                    <Text className="text-xs text-white">
                      Background: {subtitlePrefs.background ? 'On' : 'Off'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
            <Text className="my-2 text-white">Quality</Text>
            <View className="flex-row flex-wrap gap-2">
              {playback.source.qualityOptions?.map((option) => (
                <Button
                  key={option.url}
                  label={option.label}
                  size="sm"
                  variant={streamUrl === option.url ? 'primary' : 'secondary'}
                  onPress={() => {
                    fallbackPositionRef.current = player.currentTime;
                    fallbackAttemptedRef.current = false;
                    setError(null);
                    resumedSourceRef.current = null;
                    setUseDirectStream(false);
                    setQualityUrl(option.url);
                  }}
                />
              )) ?? (
                <Text className="text-neutral-300">Automatic (source provides one stream)</Text>
              )}
            </View>
            <Text className="my-2 text-xs text-neutral-300">
              {externalCues.length
                ? 'English captions from this episode'
                : externalError || subtitleLabel}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {/* Non-fullscreen info section */}
      {!fullscreen ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 6 }}>
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
            {playback.isOffline
              ? 'Playing from downloaded offline storage.'
              : playback.source.isDemo || playback.source.availability === 'demo'
                ? (playback.source.note ?? 'Demo sample stream for development only.')
                : (playback.source.note ?? `Streaming via ${providerLabel}.`)}
          </Text>
          {!playback.isOffline && !playback.source.isDemo ? (
            <Text variant="caption" className="text-neutral-500">
              Source: {providerLabel}
              {playback.source.quality ? ` · ${playback.source.quality}` : ''}
            </Text>
          ) : null}
          <SourceWebsiteButton routeId={playback.source.providerId} />
        </View>
      ) : null}
    </View>
  );
}
