import { TextInput, type TextInputProps } from 'react-native';

import { cn } from '@/utils/cn';

export type InputProps = TextInputProps & {
  className?: string;
};

export function Input({ className, placeholderTextColor, ...props }: InputProps) {
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? '#737373'}
      className={cn(
        'rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900',
        'dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50',
        className,
      )}
      {...props}
    />
  );
}
