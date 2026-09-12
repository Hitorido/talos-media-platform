import { ScrollView, type ScrollViewProps } from 'react-native';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';

import { cn } from '@/utils/cn';

export type ScreenProps = SafeAreaViewProps & {
  scrollable?: boolean;
  contentContainerClassName?: string;
  scrollViewProps?: ScrollViewProps;
};

export function Screen({
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
          contentContainerClassName={cn('px-4 py-6', contentContainerClassName)}
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
      {children}
    </SafeAreaView>
  );
}
