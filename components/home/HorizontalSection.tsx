import { Children, cloneElement, isValidElement, useState, type ReactNode } from 'react';
import { Modal, ScrollView, View, type ScrollViewProps } from 'react-native';

import { SectionHeader } from '@/components/home/SectionHeader';
import { Button, Screen, Text } from '@/components/ui';
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
  const [expanded, setExpanded] = useState(false);
  const expandedItems = Children.map(children, (child) => {
    if (!isValidElement<{ onPress?: () => void; onContinue?: () => void }>(child)) return child;
    const closeThen = (action?: () => void) =>
      action
        ? () => {
            setExpanded(false);
            action();
          }
        : undefined;
    return cloneElement(child, {
      onPress: closeThen(child.props.onPress),
      onContinue: closeThen(child.props.onContinue),
    });
  });
  return (
    <View className={cn('gap-3', className)}>
      <SectionHeader
        title={title}
        onActionPress={title ? (onSeeAllPress ?? (() => setExpanded(true))) : undefined}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName={cn('gap-3 px-4', contentClassName)}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
      <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
        <Screen scrollable contentContainerClassName="gap-5 p-4">
          <View className="flex-row items-center gap-3">
            <Text variant="h2" className="flex-1">
              {title}
            </Text>
            <Button
              label="Close"
              size="sm"
              variant="secondary"
              onPress={() => setExpanded(false)}
            />
          </View>
          <View className="flex-row flex-wrap gap-4">{expanded ? expandedItems : null}</View>
        </Screen>
      </Modal>
    </View>
  );
}
