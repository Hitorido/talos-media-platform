import { Platform, type ViewStyle } from 'react-native';

import type { ColorScheme } from './colors';

export type ShadowToken = 'none' | 'sm' | 'md' | 'lg' | 'xl';

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

const iosShadowColor = {
  light: '#000000',
  dark: '#000000',
};

const shadowDefinitions: Record<ShadowToken, Omit<ShadowStyle, 'shadowColor'>> = {
  none: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const shadowClassNames: Record<ShadowToken, string> = {
  none: '',
  sm: Platform.OS === 'web' ? 'shadow-sm' : '',
  md: Platform.OS === 'web' ? 'shadow-md' : '',
  lg: Platform.OS === 'web' ? 'shadow-lg' : '',
  xl: Platform.OS === 'web' ? 'shadow-xl' : '',
};

export function getShadowStyle(token: ShadowToken, scheme: ColorScheme): ShadowStyle {
  const base = shadowDefinitions[token];

  if (Platform.OS === 'android') {
    return {
      shadowColor: iosShadowColor[scheme],
      ...base,
    };
  }

  if (Platform.OS === 'ios') {
    return {
      shadowColor: iosShadowColor[scheme],
      ...base,
    };
  }

  return base;
}

export const shadows = {
  tokens: shadowDefinitions,
  classNames: shadowClassNames,
  getStyle: getShadowStyle,
};
