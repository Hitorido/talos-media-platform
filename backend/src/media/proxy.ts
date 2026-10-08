import { contentGateway } from '../providers/contentGateway.js';
import type { Request, Response } from 'express';
import { once } from 'node:events';
import { checkedDownloadUrl } from '../providers/animexin/adapter.js';
import { ProviderGatewayError } from '../providers/types.js';

let active = 0;
/** Fixed-origin image policies. No caller-supplied URL, host, credentials or headers. */
export function imageTarget(provider: string, path: unknown) {
  if (typeof path !== 'string') throw new ProviderGatewayError('Invalid media path.', 400);
  if (
    provider === 'mangapill' &&
    /^\/file\/(?:mangapill\/i\/\d+|mangap\/\d+\/\d+\/\d+)\.(?:webp|png|jpe?g)(?:\?[ht]=[a-zA-Z0-9-]+)?$/.test(
      path,
    )
  )
    return { url: 'https://cdn.readdetectiveconan.com' + path, referer: 'https://mangapill.com/' };
  if (
    provider === 'manhuaplus' &&
    /^\/ch\/\d+\/[A-Za-z0-9_/-]+\.(?:webp|png|jpe?g)$/.test(path) &&
    !path.includes('//')
  )
    return { url: 'https://cdn.manhuaplus.cc' + path, referer: 'https://manhuaplus.org/' };
  if (
    provider === 'manhuaplus' &&
    /^\/\d{4}\/\d{2}\/\d{2}\/[a-zA-Z0-9-]+\.(?:webp|png|jpe?g)$/.test(path)
  )
    return { url: 'https://cdn.manhuaplus.org' + path, referer: 'https://manhuaplus.org/' };
  throw new ProviderGatewayError('Unsupported source or media path.', 400);
}
export function checkedRange(value?: string) {
  if (value && !/^bytes=(?:\d+-\d*|-\d+)$/.test(value))
    throw new ProviderGatewayError('Only one byte range is supported.', 416);
  if (value) {
    const [start, end] = value.slice(6).split('-');
    if (
      [start, end].some((part) => part && !Number.isSafeInteger(Number(part))) ||
      (start && end && Number(end) < Number(start)) ||
      (!start && Number(end) === 0)
    )
      throw new ProviderGatewayError('Invalid byte range.', 416);
  }
  return value;
}
/** Backpressure-aware transfer with bounded size, idle deadline and disconnect cancellation. */
async function transfer(
  req: Request,
  res: Response,
  target: { url: string; referer?: string },
  video: boolean,
) {
  if (active >= 8) throw new ProviderGatewayError('Media proxy busy. Try again shortly.', 429);
  const range = video ? checkedRange(req.headers.range) : undefined;
  active++;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const touch = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), 30_000);
  };
  const disconnected = () => {
    if (!res.writableEnded) controller.abort();
  };
  req.once('aborted', disconnected);
  res.once('close', disconnected);
  touch();
  const maximum = video ? 1_000_000_000 : 10_000_000;
  try {
    const upstream = await fetch(target.url, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        ...(target.referer ? { Referer: target.referer } : {}),
        ...(range ? { Range: range } : {}),
      },
    });
    if (upstream.status === 416) {
      res.status(416);
      const value = upstream.headers.get('content-range');
      if (value) res.setHeader('Content-Range', value);
      res.end();
      return;
    }
    const type = (upstream.headers.get('content-type') ?? '').split(';')[0];
    if (
      !upstream.ok ||
      !(video
        ? ['video/mp4', 'application/octet-stream'].includes(type)
        : /^image\/(?:jpeg|png|webp|gif|avif)$/.test(type))
    )
      throw new ProviderGatewayError('Source media unavailable.', 502);
    const length = Number(upstream.headers.get('content-length'));
    if (length > maximum) throw new ProviderGatewayError('Media exceeds proxy size limit.', 502);
    res.status(upstream.status);
    res.setHeader('Content-Type', video ? 'video/mp4' : type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', video ? 'private, no-store' : 'public, max-age=3600');
    for (const header of [
      'content-length',
      'content-range',
      'accept-ranges',
      'etag',
      'last-modified',
    ]) {
      const value = upstream.headers.get(header);
      if (value && !(header === 'content-length' && upstream.headers.has('content-encoding')))
        res.setHeader(header, value);
    }
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    if (!upstream.body) throw new ProviderGatewayError('Empty source media.', 502);
    let received = 0;
    for await (const chunk of upstream.body as unknown as AsyncIterable<Uint8Array>) {
      received += chunk.length;
      touch();
      if (received > maximum)
        throw new ProviderGatewayError('Media exceeds proxy size limit.', 502);
      if (!res.write(chunk)) await once(res, 'drain', { signal: controller.signal });
    }
    res.end();
  } catch (error) {
    if (res.headersSent) res.destroy();
    else if (error instanceof ProviderGatewayError) throw error;
    else throw new ProviderGatewayError('Media transfer failed or timed out.', 502);
  } finally {
    controller.abort();
    clearTimeout(timer!);
    req.off('aborted', disconnected);
    res.off('close', disconnected);
    active--;
  }
}
export async function imageProxy(req: Request, res: Response) {
  if (Object.keys(req.query).some((key) => key !== 'path'))
    throw new ProviderGatewayError('Unknown proxy parameter.', 400);
  await transfer(req, res, imageTarget(req.params.providerId, req.query.path), false);
}
/** Resolve an existing public episode through its adapter; never accept a raw video URL. */
export async function videoProxy(req: Request, res: Response) {
  if (req.params.providerId !== 'animexin' || Object.keys(req.query).length)
    throw new ProviderGatewayError('Unsupported video proxy request.', 400);
  checkedRange(req.headers.range);
  const source = await contentGateway.getPlaybackSource(
    'anime',
    'animexin',
    req.params.mediaId,
    req.params.episodeId,
  );
  await transfer(req, res, { url: checkedDownloadUrl(source.url) }, true);
}
