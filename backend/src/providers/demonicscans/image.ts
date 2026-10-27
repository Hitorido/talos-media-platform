import type { Request, Response } from 'express';
import { ProviderGatewayError } from '../types.js';

export async function demonicScansImage(req: Request, res: Response) {
  const { url } = req.query;
  if (
    Object.keys(req.query).some((key) => key !== 'url') ||
    typeof url !== 'string' ||
    !url.startsWith('https://mangareadon.org/')
  ) {
    throw new ProviderGatewayError('Invalid DemonicScans image URL.', 400, 'INVALID_IMAGE_URL');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      redirect: 'error',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://demonicscans.org/',
      },
    });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !type.startsWith('image/'))
      throw new ProviderGatewayError('DemonicScans image unavailable.', 502);
    const reader = response.body?.getReader();
    if (!reader) throw new ProviderGatewayError('Empty source image.', 502);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 10000000) {
        await reader.cancel();
        throw new ProviderGatewayError('Image exceeds size limit.', 502);
      }
      chunks.push(value);
    }
    res.setHeader('Content-Type', type);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(Buffer.concat(chunks));
  } finally {
    clearTimeout(timer);
  }
}
