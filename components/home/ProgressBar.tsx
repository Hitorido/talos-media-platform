import { View } from 'react-native';

import { cn } from '@/utils/cn';

type ProgressBarProps = {
  progress: number;
  className?: string;
};

export function ProgressBar({ progress, className }: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View className={cn('h-1 overflow-hidden rounded-full bg-neutral-200/80', className)}>
      <View
        className="h-full rounded-full bg-primary-500"
        style={{ width: `${clampedProgress * 100}%` }}
      />
    </View>
  );
}
