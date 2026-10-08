/** Most frequent quantized RGB bucket; transparent pixels do not influence the palette. */
export function dominantColor(data: ArrayLike<number>, channels: number): string {
  const bins = new Map<string, { count: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += channels) {
    if (channels === 4 && data[i + 3] < 128) continue;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const key = [r >> 5, g >> 5, b >> 5].join(',');
    const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bin.count++;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bins.set(key, bin);
  }
  const best = [...bins.values()].sort((a, b) => b.count - a.count)[0];
  return best
    ? '#' +
        [best.r, best.g, best.b]
          .map((v) =>
            Math.round(v / best.count)
              .toString(16)
              .padStart(2, '0'),
          )
          .join('')
    : '#171717';
}
