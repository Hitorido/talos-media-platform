import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { Platform, View, ScrollView, type ScrollViewProps } from 'react-native';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';

import { cn } from '@/utils/cn';

export type ScreenProps = SafeAreaViewProps & {
  transitionKey?: string;
  scrollable?: boolean;
  contentContainerClassName?: string;
  scrollViewProps?: ScrollViewProps;
};

function ScreenBody({
  children,
  scrollable = false,
  className,
  contentContainerClassName,
  scrollViewProps,
  ...props
}: ScreenProps) {
  if (scrollable) {
    return (
      <SafeAreaView
        className={cn('flex-1 bg-neutral-50 dark:bg-neutral-950', className)}
        {...props}
      >
        <ScrollView
          contentContainerClassName={cn(
            'px-4 py-6 w-full max-w-7xl self-center',
            contentContainerClassName,
          )}
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={cn('flex-1 bg-neutral-50 dark:bg-neutral-950', className)} {...props}>
      {Platform.OS === 'web' ? (
        <View style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 1280, alignSelf: 'center' }}>
          {children}
        </View>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

/** Fade content changes without sliding the detail route or intercepting touches. */
export function Screen({ transitionKey, ...props }: ScreenProps) {
  if (!transitionKey) return <ScreenBody {...props} />;
  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        key={transitionKey}
        style={{ flex: 1 }}
        entering={FadeIn.duration(140).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(100).reduceMotion(ReduceMotion.System)}
      >
        <ScreenBody {...props} />
      </Animated.View>
    </View>
  );
}
