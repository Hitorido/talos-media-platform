import { fontFamily, fontSize } from './tokens';

export type TypographyVariant =
  'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'label' | 'mono';

export const typographyVariants: Record<
  TypographyVariant,
  { className: string; fontSize: string; lineHeight: string; fontWeight: string }
> = {
  display: {
    className: 'text-4xl font-bold tracking-tight',
    fontSize: fontSize['4xl'][0] as string,
    lineHeight: fontSize['4xl'][1].lineHeight as string,
    fontWeight: '700',
  },
  h1: {
    className: 'text-3xl font-bold tracking-tight',
    fontSize: fontSize['3xl'][0] as string,
    lineHeight: fontSize['3xl'][1].lineHeight as string,
    fontWeight: '700',
  },
  h2: {
    className: 'text-2xl font-semibold tracking-tight',
    fontSize: fontSize['2xl'][0] as string,
    lineHeight: fontSize['2xl'][1].lineHeight as string,
    fontWeight: '600',
  },
  h3: {
    className: 'text-xl font-semibold',
    fontSize: fontSize.xl[0] as string,
    lineHeight: fontSize.xl[1].lineHeight as string,
    fontWeight: '600',
  },
  body: {
    className: 'text-base',
    fontSize: fontSize.base[0] as string,
    lineHeight: fontSize.base[1].lineHeight as string,
    fontWeight: '400',
  },
  bodySmall: {
    className: 'text-sm',
    fontSize: fontSize.sm[0] as string,
    lineHeight: fontSize.sm[1].lineHeight as string,
    fontWeight: '400',
  },
  caption: {
    className: 'text-xs',
    fontSize: fontSize.xs[0] as string,
    lineHeight: fontSize.xs[1].lineHeight as string,
    fontWeight: '400',
  },
  label: {
    className: 'text-sm font-medium',
    fontSize: fontSize.sm[0] as string,
    lineHeight: fontSize.sm[1].lineHeight as string,
    fontWeight: '500',
  },
  mono: {
    className: 'font-mono text-sm',
    fontSize: fontSize.sm[0] as string,
    lineHeight: fontSize.sm[1].lineHeight as string,
    fontWeight: '400',
  },
};

export const typography = {
  fontFamily,
  fontSize,
  variants: typographyVariants,
};
