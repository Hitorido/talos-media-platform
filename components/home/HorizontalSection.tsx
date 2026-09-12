import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';

import { SectionHeader } from '@/components/home/SectionHeader';
import { cn } from '@/utils/cn';

type HorizontalSectionProps = {
  title: string;
  children: ReactNode;
  onSeeAllPress?: () => void;
  contentClassName?: string;
  scrollViewProps?: ScrollViewProps;
  className?: string;
};

export function HorizontalSection({
  title,
  children,
  onSeeAllPress,
  contentClassName,
  scrollViewProps,
  className,
}: HorizontalSectionProps) {
  return (
    <View className={cn('gap-3', className)}>
      <SectionHeader title={title} onActionPress={onSeeAllPress} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName={cn('gap-3 px-4', contentClassName)}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    </View>
  );
}
