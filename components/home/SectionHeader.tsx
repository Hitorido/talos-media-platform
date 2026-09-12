import { Pressable } from 'react-native';

import { Text } from '@/components/ui';
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
    <Pressable
      className={cn('flex-row items-center justify-between px-4', className)}
      onPress={onActionPress}
      disabled={!onActionPress}
    >
      <Text variant="h3">{title}</Text>
      <Text variant="label" tone="primary">
        {actionLabel}
      </Text>
    </Pressable>
  );
}
