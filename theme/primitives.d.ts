declare const primitives: {
  palette: Record<string, Record<string, string>>;
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  fontSize: Record<string, [string, { lineHeight: string; letterSpacing?: string }]>;
  fontFamily: Record<string, string[]>;
};

export = primitives;
