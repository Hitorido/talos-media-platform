import { View, type ViewProps } from 'react-native';

import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/cn';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'anime' | 'manga' | 'novel' | 'success';

export type BadgeProps = ViewProps & {
  label: string;
  variant?: BadgeVariant;
  className?: string;
};

const variantClassNames: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 dark:bg-neutral-800',
  primary: 'bg-primary-100 dark:bg-primary-950',
  secondary: 'bg-neutral-200 dark:bg-neutral-700',
  anime: 'bg-rose-100 dark:bg-rose-950',
  manga: 'bg-amber-100 dark:bg-amber-950',
  novel: 'bg-emerald-100 dark:bg-emerald-950',
  success: 'bg-green-100 dark:bg-green-950',
};

const variantTextClassNames: Record<BadgeVariant, string> = {
  default: 'text-neutral-700 dark:text-neutral-200',
  primary: 'text-primary-700 dark:text-primary-300',
  secondary: 'text-neutral-800 dark:text-neutral-100',
  anime: 'text-rose-700 dark:text-rose-300',
  manga: 'text-amber-700 dark:text-amber-300',
  novel: 'text-emerald-700 dark:text-emerald-300',
  success: 'text-green-700 dark:text-green-300',
};

export function Badge({ label, variant = 'default', className, ...props }: BadgeProps) {
  return (
    <View
      className={cn('self-start rounded-full px-3 py-1', variantClassNames[variant], className)}
      {...props}
    >
      <Text variant="caption" className={variantTextClassNames[variant]}>
        {label}
      </Text>
    </View>
  );
}
