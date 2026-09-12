import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  textClassName?: string;
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 active:bg-primary-700 dark:bg-primary-500 dark:active:bg-primary-600',
  secondary: 'bg-neutral-100 active:bg-neutral-200 dark:bg-neutral-800 dark:active:bg-neutral-700',
  outline:
    'border border-neutral-200 bg-transparent active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800',
  ghost: 'bg-transparent active:bg-neutral-100 dark:active:bg-neutral-800',
  destructive: 'bg-red-500 active:bg-red-600 dark:bg-red-600 dark:active:bg-red-700',
};

const variantTextClassNames: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-neutral-900 dark:text-neutral-50',
  outline: 'text-neutral-900 dark:text-neutral-50',
  ghost: 'text-neutral-900 dark:text-neutral-50',
  destructive: 'text-white',
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 rounded-lg',
  md: 'px-4 py-3 rounded-xl',
  lg: 'px-6 py-4 rounded-2xl',
};

const sizeTextVariants: Record<ButtonSize, 'bodySmall' | 'label' | 'body'> = {
  sm: 'bodySmall',
  md: 'label',
  lg: 'body',
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center',
        variantClassNames[variant],
        sizeClassNames[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'destructive' ? '#ffffff' : undefined}
        />
      ) : (
        <Text
          variant={sizeTextVariants[size]}
          className={cn(variantTextClassNames[variant], textClassName)}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
