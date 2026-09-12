import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { typographyVariants, type TypographyVariant } from '@/theme/typography';
import { cn } from '@/utils/cn';

type TextTone =
  'default' | 'muted' | 'primary' | 'destructive' | 'success' | 'anime' | 'manga' | 'novel';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  className?: string;
};

const toneClassNames: Record<TextTone, string> = {
  default: 'text-neutral-900 dark:text-neutral-50',
  muted: 'text-neutral-500 dark:text-neutral-400',
  primary: 'text-primary-600 dark:text-primary-400',
  destructive: 'text-red-500 dark:text-red-400',
  success: 'text-green-500 dark:text-green-400',
  anime: 'text-rose-500 dark:text-rose-400',
  manga: 'text-amber-500 dark:text-amber-400',
  novel: 'text-emerald-500 dark:text-emerald-400',
};

export function Text({ variant = 'body', tone = 'default', className, ...props }: TextProps) {
  return (
    <RNText
      className={cn(typographyVariants[variant].className, toneClassNames[tone], className)}
      {...props}
    />
  );
}
