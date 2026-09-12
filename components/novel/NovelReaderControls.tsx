import { useEffect, useRef, useState } from 'react';
import { PanResponder, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import type {
    NovelFontFamily,
    NovelLineSpacing,
    NovelMargin,
    NovelTheme,
    ReaderSettings,
} from '@/types/novel';
import { cn } from '@/utils/cn';

type NovelReaderControlsProps = {
  settings: ReaderSettings;
  progress: number;
  onSeekProgress: (progress: number) => void;
  showSettingsSheet: boolean;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
};

const themeContainerClasses: Record<NovelTheme, string> = {
  dark: 'bg-neutral-950/95 border-neutral-800',
  light: 'bg-white/95 border-neutral-200',
  sepia: 'bg-[#f4ecd8]/95 border-[#e2d5b5]',
  midnight: 'bg-[#0f172a]/95 border-[#1e293b]',
};

const themeTextClasses: Record<NovelTheme, string> = {
  dark: 'text-white',
  light: 'text-neutral-900',
  sepia: 'text-[#433422]',
  midnight: 'text-[#e2e8f0]',
};

const themeMutedTextClasses: Record<NovelTheme, string> = {
  dark: 'text-neutral-400',
  light: 'text-neutral-600',
  sepia: 'text-[#7c6a53]',
  midnight: 'text-[#94a3b8]',
};

const themeInnerPillClasses: Record<NovelTheme, string> = {
  dark: 'bg-neutral-900',
  light: 'bg-neutral-100',
  sepia: 'bg-[#e6dcbe]',
  midnight: 'bg-[#1e293b]',
};

const themeButtonClasses: Record<NovelTheme, { unselected: string; selected: string }> = {
  dark: {
    unselected: 'bg-neutral-800 border-neutral-700 text-white',
    selected: 'bg-primary-600 border-primary-500 text-white font-bold',
  },
  light: {
    unselected: 'bg-neutral-200 border-neutral-300 text-neutral-900',
    selected: 'bg-primary-600 border-primary-500 text-white font-bold',
  },
  sepia: {
    unselected: 'bg-[#e6dcbe] border-[#d5c7a3] text-[#433422]',
    selected: 'bg-primary-600 border-primary-500 text-white font-bold',
  },
  midnight: {
    unselected: 'bg-[#1e293b] border-[#334155] text-[#e2e8f0]',
    selected: 'bg-primary-600 border-primary-500 text-white font-bold',
  },
};

const themeButtonTextClasses: Record<NovelTheme, string> = {
  dark: 'text-white',
  light: 'text-neutral-900',
  sepia: 'text-[#433422]',
  midnight: 'text-[#e2e8f0]',
};

const themeTextColors: Record<NovelTheme, string> = {
  dark: '#ffffff',
  light: '#171717',
  sepia: '#433422',
  midnight: '#e2e8f0',
};

const fontFamilies: { id: NovelFontFamily; name: string }[] = [
  { id: 'serif', name: 'Serif' },
  { id: 'sans', name: 'Sans' },
  { id: 'mono', name: 'Mono' },
];

const lineSpacings: { id: NovelLineSpacing; name: string }[] = [
  { id: 'compact', name: 'Compact' },
  { id: 'normal', name: 'Normal' },
  { id: 'relaxed', name: 'Relaxed' },
];

const margins: { id: NovelMargin; name: string }[] = [
  { id: 'narrow', name: 'Narrow' },
  { id: 'medium', name: 'Medium' },
  { id: 'wide', name: 'Wide' },
];

export function NovelReaderControls({
  settings,
  progress,
  onSeekProgress,
  showSettingsSheet,
  hasPrevChapter,
  hasNextChapter,
  onUpdateSettings,
  onPrevChapter,
  onNextChapter,
}: NovelReaderControlsProps) {
  const insets = useSafeAreaInsets();
  const activeTheme = settings.theme;
  const [progressWidth, setProgressWidth] = useState(0);
  const gestureRef = useRef({ width: 0, start: 0, seek: onSeekProgress });

  useEffect(() => {
    gestureRef.current.width = progressWidth;
    gestureRef.current.seek = onSeekProgress;
  }, [onSeekProgress, progressWidth]);

  // Keep one responder instance so dragging is not interrupted by progress updates.
  // eslint-disable-next-line react-hooks/refs
  const [progressResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const gesture = gestureRef.current;
        if (!gesture.width) return;
        gesture.start = Math.max(0, Math.min(1, event.nativeEvent.locationX / gesture.width));
        gesture.seek(gesture.start);
      },
      onPanResponderMove: (_event, state) => {
        const gesture = gestureRef.current;
        if (!gesture.width) return;
        gesture.seek(Math.max(0, Math.min(1, gesture.start + state.dx / gesture.width)));
      },
    }),
  );

  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      className={cn(
        'absolute bottom-0 left-0 right-0 z-20 max-h-[55vh] border-t px-4 pt-3 shadow-2xl',
        themeContainerClasses[activeTheme],
      )}
    >
      {showSettingsSheet ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 pb-2">
          {/* Scroll Mode Selection (Continuous vs Normal) */}
          <View className="flex-row items-center justify-between gap-2">
            <Text
              style={{ color: themeTextColors[activeTheme] }}
              className={cn('text-xs font-semibold', themeMutedTextClasses[activeTheme])}
            >
              Mode
            </Text>
            <View className={cn('flex-row rounded-lg p-1', themeInnerPillClasses[activeTheme])}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onUpdateSettings({ scrollMode: 'continuous' })}
                className={cn(
                  'rounded px-3 py-1',
                  settings.scrollMode === 'continuous' ? 'bg-primary-600' : 'bg-transparent',
                )}
              >
                <Text
                  style={{
                    color:
                      settings.scrollMode === 'continuous'
                        ? '#ffffff'
                        : themeTextColors[activeTheme],
                  }}
                  className={cn(
                    'text-xs font-medium',
                    settings.scrollMode === 'continuous'
                      ? 'text-white'
                      : themeTextClasses[activeTheme],
                  )}
                >
                  Continuous 📜
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onUpdateSettings({ scrollMode: 'normal' })}
                className={cn(
                  'rounded px-3 py-1',
                  settings.scrollMode === 'normal' ? 'bg-primary-600' : 'bg-transparent',
                )}
              >
                <Text
                  style={{
                    color:
                      settings.scrollMode === 'normal' ? '#ffffff' : themeTextColors[activeTheme],
                  }}
                  className={cn(
                    'text-xs font-medium',
                    settings.scrollMode === 'normal' ? 'text-white' : themeTextClasses[activeTheme],
                  )}
                >
                  Normal 📖
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Theme Selection */}
          <View className="flex-row items-center justify-between gap-2 border-t border-neutral-500/20 pt-2">
            <Text
              style={{ color: themeTextColors[activeTheme] }}
              className={cn('text-xs font-semibold', themeMutedTextClasses[activeTheme])}
            >
              Theme
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {(['dark', 'light', 'sepia', 'midnight'] as NovelTheme[]).map((tId) => {
                const isSelected = settings.theme === tId;
                const btnConfig = themeButtonClasses[tId];
                return (
                  <TouchableOpacity
                    key={tId}
                    activeOpacity={0.7}
                    onPress={() => onUpdateSettings({ theme: tId })}
                    className={cn(
                      'rounded-lg border px-3 py-1 capitalize',
                      isSelected ? btnConfig.selected : btnConfig.unselected,
                    )}
                  >
                    <Text
                      style={{ color: isSelected ? '#ffffff' : themeTextColors[tId] }}
                      className={cn(
                        'text-xs font-medium capitalize',
                        isSelected ? 'text-white' : themeButtonTextClasses[tId],
                      )}
                    >
                      {tId}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Text Size & Family */}
          <View className="flex-row flex-wrap items-center justify-between gap-2 border-t border-neutral-500/20 pt-2">
            <Text
              style={{ color: themeTextColors[activeTheme] }}
              className={cn('text-xs font-semibold', themeMutedTextClasses[activeTheme])}
            >
              Text Size
            </Text>
            <View className="flex-row flex-wrap items-center gap-2">
              {/* Font Size Controls */}
              <View
                className={cn(
                  'flex-row items-center rounded-lg p-1',
                  themeInnerPillClasses[activeTheme],
                )}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    onUpdateSettings({ fontSize: Math.max(12, settings.fontSize - 2) })
                  }
                  className="rounded bg-neutral-500/20 px-2.5 py-1"
                >
                  <Text
                    style={{ color: themeTextColors[activeTheme] }}
                    className={cn('text-xs font-bold', themeTextClasses[activeTheme])}
                  >
                    A-
                  </Text>
                </TouchableOpacity>
                <Text
                  style={{ color: themeTextColors[activeTheme] }}
                  className={cn('px-2 text-xs font-medium', themeTextClasses[activeTheme])}
                >
                  {settings.fontSize}pt
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    onUpdateSettings({ fontSize: Math.min(32, settings.fontSize + 2) })
                  }
                  className="rounded bg-neutral-500/20 px-2.5 py-1"
                >
                  <Text
                    style={{ color: themeTextColors[activeTheme] }}
                    className={cn('text-xs font-bold', themeTextClasses[activeTheme])}
                  >
                    A+
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Font Family Selection */}
              <View className={cn('flex-row rounded-lg p-1', themeInnerPillClasses[activeTheme])}>
                {fontFamilies.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    activeOpacity={0.7}
                    onPress={() => onUpdateSettings({ fontFamily: f.id })}
                    className={cn(
                      'rounded px-2.5 py-1',
                      settings.fontFamily === f.id ? 'bg-primary-600' : 'bg-transparent',
                    )}
                  >
                    <Text
                      style={{
                        color:
                          settings.fontFamily === f.id ? '#ffffff' : themeTextColors[activeTheme],
                      }}
                      className={cn(
                        'text-xs font-medium',
                        settings.fontFamily === f.id ? 'text-white' : themeTextClasses[activeTheme],
                      )}
                    >
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Line Spacing & Margins */}
          <View className="flex-row flex-wrap items-center justify-between gap-2 border-t border-neutral-500/20 pt-2">
            <View className="flex-row items-center gap-1.5">
              <Text
                style={{ color: themeTextColors[activeTheme] }}
                className={cn('text-xs font-semibold', themeMutedTextClasses[activeTheme])}
              >
                Spacing
              </Text>
              <View className={cn('flex-row rounded-lg p-1', themeInnerPillClasses[activeTheme])}>
                {lineSpacings.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    activeOpacity={0.7}
                    onPress={() => onUpdateSettings({ lineSpacing: s.id })}
                    className={cn(
                      'rounded px-2 py-0.5',
                      settings.lineSpacing === s.id ? 'bg-primary-600' : 'bg-transparent',
                    )}
                  >
                    <Text
                      style={{
                        color:
                          settings.lineSpacing === s.id ? '#ffffff' : themeTextColors[activeTheme],
                      }}
                      className={cn(
                        'text-[10px] font-medium',
                        settings.lineSpacing === s.id
                          ? 'text-white'
                          : themeTextClasses[activeTheme],
                      )}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="flex-row items-center gap-1.5">
              <Text
                style={{ color: themeTextColors[activeTheme] }}
                className={cn('text-xs font-semibold', themeMutedTextClasses[activeTheme])}
              >
                Margin
              </Text>
              <View className={cn('flex-row rounded-lg p-1', themeInnerPillClasses[activeTheme])}>
                {margins.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.7}
                    onPress={() => onUpdateSettings({ margin: m.id })}
                    className={cn(
                      'rounded px-2 py-0.5',
                      settings.margin === m.id ? 'bg-primary-600' : 'bg-transparent',
                    )}
                  >
                    <Text
                      style={{
                        color: settings.margin === m.id ? '#ffffff' : themeTextColors[activeTheme],
                      }}
                      className={cn(
                        'text-[10px] font-medium',
                        settings.margin === m.id ? 'text-white' : themeTextClasses[activeTheme],
                      )}
                    >
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      ) : null}

      {!showSettingsSheet ? (
        <>
          <View
            className="mb-2 h-5 px-1"
            onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)}
          >
            <View
              className="absolute left-1 right-1 top-1.5 h-2 rounded-full bg-neutral-800"
              {...progressResponder.panHandlers}
            >
              <View
                className="absolute left-0 h-full rounded-full bg-primary-500"
                style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
                pointerEvents="none"
              />
              <View
                className="absolute -top-1.5 h-5 w-5 rounded-full border-2 border-white bg-primary-500"
                style={{
                  left: `${Math.max(0, Math.min(1, progress)) * 100}%`,
                  transform: [{ translateX: -10 }],
                }}
                pointerEvents="none"
              />
            </View>
          </View>

          {/* Chapter Navigation Row */}
          <View className="flex-row items-center justify-between border-t border-neutral-500/20 pt-2">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onPrevChapter}
              disabled={!hasPrevChapter}
              className={cn(
                'rounded-lg border border-neutral-500/30 px-4 py-2',
                themeInnerPillClasses[activeTheme],
                !hasPrevChapter && 'opacity-40',
              )}
            >
              <Text
                style={{ color: themeTextColors[activeTheme] }}
                className={cn('text-xs font-semibold', themeTextClasses[activeTheme])}
              >
                « Prev Chapter
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onNextChapter}
              disabled={!hasNextChapter}
              className={cn(
                'rounded-lg border border-neutral-500/30 px-4 py-2',
                themeInnerPillClasses[activeTheme],
                !hasNextChapter && 'opacity-40',
              )}
            >
              <Text
                style={{ color: themeTextColors[activeTheme] }}
                className={cn('text-xs font-semibold', themeTextClasses[activeTheme])}
              >
                Next Chapter »
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}
    </View>
  );
}
