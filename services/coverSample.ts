import { decode } from 'jpeg-js';
import { dominantColor } from '@/services/coverPalette';

/** Decode only the small JPEG produced by ImageManipulator, using Hermes-safe typed arrays. */
export function coverSampleColor(bytes: Uint8Array): string {
  if (!bytes.length || bytes.length > 65536) throw new Error('Invalid cover sample size.');
  const image = decode(bytes, {
    useTArray: true,
    formatAsRGBA: true,
    tolerantDecoding: false,
    maxResolutionInMP: 0.01,
    maxMemoryUsageInMB: 4,
  });
  if (image.width > 32 || image.height > 32) throw new Error('Cover sample is too large.');
  return dominantColor(image.data, 4);
}
