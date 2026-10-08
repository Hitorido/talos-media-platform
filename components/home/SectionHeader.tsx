import { View } from 'react-native';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';

import { Button, Text } from '@/components/ui';
import { cn } from '@/utils/cn';

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  className?: string;
};

export function SectionHeader({
  title,
  actionLabel = 'See all',
  onActionPress,
  className,
}: SectionHeaderProps) {
  return (
    <View className={cn('flex-row items-center justify-between px-4', className)}>
      <Pressable onPress={onActionPress} disabled={!onActionPress} className="flex-1 pr-3">
        <Text variant="h3">{title}</Text>
      </Pressable>
      {onActionPress ? (
        <Button label={actionLabel} size="sm" variant="secondary" onPress={onActionPress} />
      ) : null}
    </View>
  );
}
