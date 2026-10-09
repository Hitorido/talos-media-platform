import { PrivacyAccessGate } from '@/components/content/PrivacyControls';
import { SourceWebsiteButton } from '@/components/content/SourceWebsiteButton';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';
import { readSubtitleText } from '@/services/offlineSubtitles';
import { parseSubtitleCues, subtitleAt, type SubtitleCue } from '@/services/subtitleCues';
import { useLibraryStore } from '@/stores/libraryStore';
import { useMediaBookmarkStore } from '@/stores/mediaBookmarkStore';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView, type SubtitleTrack, type VideoPlayer } from 'expo-video';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  LayoutChangeEvent,
  PanResponder,
  ScrollView,
  Pressable as SurfacePressable,
  View,
} from 'react-native';

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

// Stable empty array so derived "no cues" states never change identity and
// cannot trigger downstream re-renders.
const EMPTY_CUES: SubtitleCue[] = [];

function AnimePlayerScreen() {
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
  const settingsOpenRef = useRef(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState('auto');
  const [nativeSubtitleTracks, setNativeSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [playhead, setPlayhead] = useState(0);
  const overlayVisibleRef = useRef(overlayVisible);
  overlayVisibleRef.current = overlayVisible;
  const lastClockUpdate = useRef(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubFraction, setScrubFraction] = useState(0);
  // Track width lives in state (not a ref) so the memoized pan responder can
  // read it during render without violating the refs-during-render rule.
  // onLayout only fires on mount/rotation, so this is not a hot path.
  const [scrubberWidth, setScrubberWidth] = useState(1);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const readyFrameRef = useRef('');
  const [bookmarkToastVisible, setBookmarkToastVisible] = useState(false);
  const resumedSourceRef = useRef<string | null>(null);
  const fallbackPositionRef = useRef<number | null>(null);
  const fallbackAttemptedRef = useRef(false);
  const lastSavedAtRef = useRef(0);
  const latestTimeRef = useRef(0);
  const [qualityUrl, setQualityUrl] = useState<string | null>(null);
  const [useDirectStream, setUseDirectStream] = useState(false);
  const [resolvedPlayback, setResolvedPlayback] = useState<ResolvedAnimePlaybackResult | null>(
    null,
  );
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [resolveRetryCount, setResolveRetryCount] = useState(0);
  const subtitlePrefs = useSubtitlePreferencesStore();

  // Everything below is derived from the current route key. While a resolution
  // is in flight the screen renders as "loading" without a synchronous
  // setState cascade, so switching episodes costs no extra render pass and
  // never flashes the previous episode's data.
  const resolveKey = `${id ?? ''}|${episodeId ?? ''}|${retry}`;
  const settled = settledKey === resolveKey;
  const playback = settled ? resolvedPlayback : null;
  const error = !id || !episodeId ? 'Missing anime or episode id.' : settled ? errorState : null;
  const loading = Boolean(id && episodeId) && !settled;

  // Reset the per-episode UI state during render (React's documented "adjust
  // state when a prop changes" pattern) rather than cascading it from an
  // effect after the fact.
  const [syncedKey, setSyncedKey] = useState(resolveKey);
  if (syncedKey !== resolveKey) {
    setSyncedKey(resolveKey);
    setSelectedSubtitle('auto');
    setUseDirectStream(false);
    setQualityUrl(null);
    setBookmarkToastVisible(false);
    setPlayhead(0);
    setResolveRetryCount(0);
  }

  // Animated opacity for the controls overlay — fades in/out smoothly.
  // Lazy state init keeps a single stable Animated.Value without reading a
  // ref during render.
  const [overlayOpacity] = useState(() => new Animated.Value(1));

  /** Show controls and restart the auto-hide timer. */
  const showControls = useCallback(() => {
    setOverlayVisible(true);
    Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (settingsOpenRef.current) return;
    overlayTimerRef.current = setTimeout(() => {
      if (settingsOpenRef.current) return;
      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
        () => {
          if (settingsOpenRef.current) return;
          setOverlayVisible(false);
          settingsOpenRef.current = false;
          setSettingsOpen(false);
        },
      );
    }, 4000);
  }, [overlayOpacity]);

  /** Toggle controls. Tapping while visible hides immediately; tap while hidden shows. */
  const toggleControls = useCallback(() => {
    if (settingsOpenRef.current) return;
    setOverlayVisible((v) => {
      if (v) {
        if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
        settingsOpenRef.current = false;
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
    if (!id || !episodeId) return;
    let cancelled = false;
    const key = `${id}|${episodeId}|${retry}`;
    resolveAnimePlayback(id, episodeId)
      .then((resolved) => {
        if (cancelled) return;
        setResolvedPlayback(resolved);
        setErrorState(null);
        setSettledKey(key);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResolvedPlayback(null);
        setErrorState(
          err instanceof Error ? err.message : 'Unable to resolve playback for this episode.',
        );
        setSettledKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [id, episodeId, retry]);

  // Transient per-episode bookkeeping. Ref writes belong in an effect, so this
  // reset stays out of the render body.
  useEffect(() => {
    readyFrameRef.current = '';
    fullscreenSourceRef.current = '';
    latestTimeRef.current = 0;
    fallbackPositionRef.current = null;
    fallbackAttemptedRef.current = false;
  }, [resolveKey]);

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
      // Ensure the anime is in the library store for continue watching/history
      useLibraryStore.getState().rememberMedia({
        id,
        title: playback.animeTitle,
        coverUrl: playback.episodeThumbnailUrl ?? '',
        bannerUrl: playback.episodeThumbnailUrl ?? '',
        genres: [],
        mediaType: 'anime',
        episodeCount: playback.episodeNumber,
      });
    },
    [id, episodeId, playback, setEpisodeProgress],
  );

  const streamUrl =
    (useDirectStream ? playback?.source.fallbackUrl : (qualityUrl ?? playback?.source.url)) ?? '';

  useEffect(() => {
    readyFrameRef.current = '';
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
    setErrorState(null);
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
    setErrorState(null);
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
    settingsOpenRef.current = false;
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
    else router.replace(animeDetailsHref(id) as any);
  }, [router, id, fullscreen, leaveFullscreen]);

  const externalTracks = playback?.source.subtitles ?? [];
  const selectedExternal = selectedSubtitle.startsWith('external:')
    ? externalTracks.find((track) => 'external:' + track.url === selectedSubtitle)
    : selectedSubtitle === 'auto'
      ? externalTracks.find((track) => /^en(?:g|[-_].*)?$/i.test(track.language))
      : undefined;
  const englishUrl = selectedExternal?.url;

  // Cue state is keyed by the subtitle URL so switching episodes resets it
  // during render instead of through a synchronous effect-body setState.
  const cueKey = englishUrl ?? null;
  const [cueState, setCueState] = useState<{
    key: string | null;
    cues: SubtitleCue[];
    error: string;
  }>({ key: null, cues: EMPTY_CUES, error: '' });
  const externalCues = cueState.key === cueKey ? cueState.cues : EMPTY_CUES;
  const externalError = cueState.key === cueKey ? cueState.error : '';

  useEffect(() => {
    if (!englishUrl) return;
    const url = englishUrl;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      setCueState({
        key: url,
        cues: EMPTY_CUES,
        error: 'English captions timed out. Video can continue.',
      });
    }, 15000);
    readSubtitleText(url, controller.signal)
      .then((text) => {
        const cues = parseSubtitleCues(text);
        if (!cues.length) throw new Error('No readable English caption cues.');
        if (!controller.signal.aborted) setCueState({ key: url, cues, error: '' });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setCueState({
            key: url,
            cues: EMPTY_CUES,
            error: 'English captions could not be loaded.',
          });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [englishUrl]);

  // Subtitle status label is keyed the same way so the "Checking…" placeholder
  // is derived, not pushed by a synchronous setState.
  const subtitleKey = `${streamUrl}|${useDirectStream ? 1 : 0}|${
    subtitlesEnabled ? 1 : 0
  }|${externalCues.length}|${selectedSubtitle}`;
  const [subtitleState, setSubtitleState] = useState<{ key: string; label: string }>({
    key: '',
    label: 'Checking English subtitles...',
  });
  const subtitleLabel =
    subtitleState.key === subtitleKey ? subtitleState.label : 'Checking English subtitles...';

  useEffect(() => {
    if (!streamUrl) return;
    const key = subtitleKey;
    const selectEnglish = (tracks: SubtitleTrack[]) => {
      setNativeSubtitleTracks(tracks);
      const english = selectedSubtitle.startsWith('native:')
        ? tracks.find((track) => 'native:' + track.id === selectedSubtitle)
        : selectedSubtitle === 'auto'
          ? tracks.find(
              (track) =>
                /^en(?:g|[-_].*)?$/i.test(track.language ?? '') ||
                /english/i.test(track.label ?? ''),
            )
          : undefined;
      player.subtitleTrack = subtitlesEnabled && !externalCues.length ? (english ?? null) : null;
      setSubtitleState({
        key,
        label: !subtitlesEnabled
          ? 'Subtitle tracks off. Captions embedded in the picture remain visible.'
          : english
            ? (english.label || english.language || 'Selected') + ' subtitles on'
            : 'No selectable English track. This video may have captions embedded in the picture.',
      });
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
  }, [player, streamUrl, useDirectStream, subtitlesEnabled, externalCues.length, selectedSubtitle]);

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
            return;
          }
          if (retryResolvePlayback()) {
            return;
          }
        }
        if (fallbackToVideo()) return;
        setErrorState('The player could not load this stream. Retry or open the source website.');
      }
    });
    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      latestTimeRef.current = currentTime;
      if (overlayVisibleRef.current && Date.now() - lastClockUpdate.current >= 1000) {
        lastClockUpdate.current = Date.now();
        setPlayhead(currentTime);
      }
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

  const seekToFraction = useCallback(
    (fraction: number) => {
      const dur = duration || playback?.durationSeconds || 0;
      if (dur <= 0) return;
      const next = Math.max(0, Math.min(dur, fraction * dur));
      player.currentTime = next;
      setPlayhead(next);
      latestTimeRef.current = next;
    },
    [duration, playback?.durationSeconds, player],
  );

  const skipBy = useCallback(
    (deltaSeconds: number) => {
      const dur = duration || playback?.durationSeconds || 0;
      const current = player.currentTime || 0;
      const next =
        dur > 0
          ? Math.max(0, Math.min(dur, current + deltaSeconds))
          : Math.max(0, current + deltaSeconds);
      player.currentTime = next;
      setPlayhead(next);
      latestTimeRef.current = next;
      showControls();
    },
    [duration, playback?.durationSeconds, player, showControls],
  );

  // Stable callbacks so the memoized pan responder never touches a ref during render.
  const clearOverlayTimer = useCallback(() => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
  }, []);

  const scrubberPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          setScrubbing(true);
          clearOverlayTimer();
          const fraction = Math.max(0, Math.min(1, event.nativeEvent.locationX / scrubberWidth));
          setScrubFraction(fraction);
        },
        onPanResponderMove: (event) => {
          const fraction = Math.max(0, Math.min(1, event.nativeEvent.locationX / scrubberWidth));
          setScrubFraction(fraction);
        },
        onPanResponderRelease: (event) => {
          const fraction = Math.max(0, Math.min(1, event.nativeEvent.locationX / scrubberWidth));
          seekToFraction(fraction);
          setScrubbing(false);
          showControls();
        },
        onPanResponderTerminate: () => {
          setScrubbing(false);
          showControls();
        },
      }),
    [seekToFraction, showControls, scrubberWidth, clearOverlayTimer],
  );

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
  const totalDuration = duration || playback.durationSeconds || 0;
  const progressFraction = totalDuration > 0 ? Math.min(1, playhead / totalDuration) : 0;
  const displayFraction = scrubbing ? scrubFraction : progressFraction;

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

      {/* Video container — tap to toggle controls. zIndex keeps overflowing
          overlays (the settings panel) painting above the info section that
          follows as a later sibling. */}
      <View
        style={
          fullscreen
            ? { flex: 1, zIndex: 1 }
            : { width: '100%', maxWidth: 1100, alignSelf: 'center', aspectRatio: 16 / 9, zIndex: 1 }
        }
      >
        <VideoView
          ref={videoViewRef}
          onFirstFrameRender={() => {
            readyFrameRef.current = streamUrl;
            void enterFullscreen();
          }}
          fullscreenOptions={{ enable: false }}
          player={player}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          nativeControls={false}
        />

        <SurfacePressable
          onPress={toggleControls}
          accessibilityRole="button"
          accessibilityLabel="Show or hide playback controls"
          style={{ position: 'absolute', inset: 0 }}
        />
        {/* External subtitle overlay */}
        <TimedCaptions
          player={player}
          cues={externalCues}
          enabled={subtitlesEnabled && externalCues.length > 0}
          fullscreen={fullscreen}
          overlayVisible={overlayVisible}
        />

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
                    const next = !settingsOpenRef.current;
                    settingsOpenRef.current = next;
                    setSettingsOpen(next);
                    overlayOpacity.stopAnimation();
                    overlayOpacity.setValue(1);
                    if (!next) showControls();
                    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
                  }}
                />
              </View>
            </View>

            {/* Center: −10s / play-pause / +10s */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 28,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rewind 10 seconds"
                onPress={() => skipBy(-10)}
                className="rounded-full bg-black/60 px-3 py-3"
              >
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>−10</Text>
              </Pressable>
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
                {isPlaying ? (
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Forward 10 seconds"
                onPress={() => skipBy(10)}
                className="rounded-full bg-black/60 px-3 py-3"
              >
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>+10</Text>
              </Pressable>
            </View>

            {/* Bottom bar: scrubber + time + fullscreen */}
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.5)',
                paddingHorizontal: 12,
                paddingBottom: 10,
                paddingTop: 6,
                gap: 4,
              }}
            >
              <View
                onLayout={(event: LayoutChangeEvent) => {
                  const next = Math.max(1, event.nativeEvent.layout.width);
                  setScrubberWidth((current) => (current === next ? current : next));
                }}
                {...scrubberPan.panHandlers}
                style={{ height: 28, justifyContent: 'center' }}
              >
                <View
                  style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${displayFraction * 100}%`,
                      backgroundColor: '#6366f1',
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>
                  {formatTime(scrubbing ? scrubFraction * totalDuration : playhead)} /{' '}
                  {formatTime(totalDuration)}
                </Text>
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

        {/* Settings panel — should hide with overlayVisible */}
        {settingsOpen && overlayVisible ? (
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
            <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
              <Button
                label="Automatic (English)"
                size="sm"
                variant={selectedSubtitle === 'auto' ? 'primary' : 'secondary'}
                onPress={() => {
                  setSelectedSubtitle('auto');
                  setSubtitlesEnabled(true);
                }}
              />
              {externalTracks.map((track, index) => (
                <Button
                  key={track.url}
                  label={track.language || `Track ${index + 1}`}
                  size="sm"
                  variant={selectedSubtitle === 'external:' + track.url ? 'primary' : 'secondary'}
                  onPress={() => {
                    setSelectedSubtitle('external:' + track.url);
                    setSubtitlesEnabled(true);
                  }}
                />
              ))}
              {nativeSubtitleTracks.map((track) => (
                <Button
                  key={track.id}
                  label={track.label || track.language || 'Subtitle track'}
                  size="sm"
                  variant={selectedSubtitle === 'native:' + track.id ? 'primary' : 'secondary'}
                  onPress={() => {
                    setSelectedSubtitle('native:' + track.id);
                    setSubtitlesEnabled(true);
                  }}
                />
              ))}
            </ScrollView>
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
                    setErrorState(null);
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
                ? (selectedExternal?.language || 'Selected') + ' captions from this episode'
                : externalError || subtitleLabel}
            </Text>
          </View>
        ) : null}
      </View>

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

const TimedCaptions = memo(function TimedCaptions({
  player,
  cues,
  enabled,
  fullscreen,
  overlayVisible,
}: {
  player: VideoPlayer;
  cues: SubtitleCue[];
  enabled: boolean;
  fullscreen: boolean;
  overlayVisible: boolean;
}) {
  const subtitlePrefs = useSubtitlePreferencesStore();
  const [activeSubtitleText, setText] = useState('');
  useEffect(() => {
    const update = () => setText(subtitleAt(cues, player.currentTime));
    update();
    const listener = player.addListener('timeUpdate', update);
    return () => listener.remove();
  }, [player, cues, enabled]);
  return enabled && activeSubtitleText ? (
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
          lineHeight: (fullscreen ? subtitlePrefs.fontSize + 4 : subtitlePrefs.fontSize) * 1.4,
        }}
      >
        {activeSubtitleText}
      </Text>
    </View>
  ) : null;
});

export default function ProtectedScreen() {
  return (
    <PrivacyAccessGate>
      <AnimePlayerScreen />
    </PrivacyAccessGate>
  );
}
