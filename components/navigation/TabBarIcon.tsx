import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

type TabBarIconProps = {
  color: ColorValue;
  name: SymbolViewProps['name'];
};

export function TabBarIcon({ color, name }: TabBarIconProps) {
  return (
    <SymbolView name={name} tintColor={typeof color === 'string' ? color : undefined} size={24} />
  );
}
