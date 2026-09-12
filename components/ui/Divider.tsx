import { View, type ViewProps } from 'react-native';

import { cn } from '@/utils/cn';

export type DividerProps = ViewProps & {
  className?: string;
};

export function Divider({ className, ...props }: DividerProps) {
  return (
    <View className={cn('h-px w-full bg-neutral-200 dark:bg-neutral-800', className)} {...props} />
  );
}
