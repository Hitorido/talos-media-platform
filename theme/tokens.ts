import primitives from './primitives.js';

export const palette = primitives.palette;
export const spacing = primitives.spacing;
export const borderRadius = primitives.borderRadius;
export const fontSize = primitives.fontSize;
export const fontFamily = primitives.fontFamily;

export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof borderRadius;
export type FontSizeKey = keyof typeof fontSize;
