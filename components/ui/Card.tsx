import { View, type ViewProps } from 'react-native';

import { getShadowStyle, shadowClassNames, type ShadowToken } from '@/theme/shadows';
import { useAppTheme } from '@/providers/ThemeProvider';
import { cn } from '@/utils/cn';

export type CardProps = ViewProps & {
  shadow?: ShadowToken;
  padded?: boolean;
  className?: string;
};

export function Card({ shadow = 'md', padded = true, className, style, ...props }: CardProps) {
  const { colorScheme } = useAppTheme();
  const shadowStyle = getShadowStyle(shadow, colorScheme);

  return (
    <View
      className={cn(
        'rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900',
        padded && 'p-4',
        shadowClassNames[shadow],
        className,
      )}
      style={[shadowStyle, style]}
      {...props}
    />
  );
}
