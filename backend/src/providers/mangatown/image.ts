import type { Request, Response } from 'express';
import { mangaTownImageUrl } from './adapter.js';
import { ProviderGatewayError } from '../types.js';

export async function mangaTownImage(req: Request, res: Response) {
  const { mediaId, chapterId, page } = req.query;
  if (Object.keys(req.query).some(key => !['mediaId', 'chapterId', 'page'].includes(key)) ||
      typeof mediaId !== 'string' || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(mediaId) ||
      (chapterId !== undefined && (typeof chapterId !== 'string' || !/^c[0-9]+(?:[.][0-9]+)?$/.test(chapterId))) ||
      (chapterId === undefined ? page !== undefined : typeof page !== 'string' || !/^[1-9][0-9]{0,2}$/.test(page) || Number(page) > 300)) {
    throw new ProviderGatewayError('Invalid MangaTown image identifiers.', 400, 'INVALID_IMAGE_PATH');
  }
  const url = await mangaTownImageUrl(mediaId, chapterId as string | undefined, page === undefined ? undefined : Number(page));
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { redirect: 'error', signal: controller.signal, headers: { Referer: 'https://www.mangatown.com/' } });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !type.startsWith('image/')) throw new ProviderGatewayError('MangaTown image unavailable.', 502);
    const reader = response.body?.getReader();
    if (!reader) throw new ProviderGatewayError('Empty source image.', 502);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length;
      if (size > 10000000) { await reader.cancel(); throw new ProviderGatewayError('Image exceeds size limit.', 502); }
      chunks.push(value);
    }
    res.setHeader('Content-Type', type); res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=60'); res.send(Buffer.concat(chunks));
  } finally { clearTimeout(timer); }
}
