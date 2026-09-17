import type { Request, Response } from 'express';
import { ProviderGatewayError } from '../types.js';

/** Source-specific image relay, not an arbitrary URL proxy. Only verified CDN file paths. */
export async function mangaPillImage(req: Request, res: Response) {
  const path = typeof req.query.path === 'string' ? req.query.path : '';
  if (!/^\/file\/(?:mangapill\/i\/\d+|mangap\/\d+\/\d+\/\d+)\.(?:webp|png|jpe?g)(?:\?[ht]=[a-zA-Z0-9-]+)?$/.test(path)) {
    throw new ProviderGatewayError('Invalid MangaPill image path.',400,'INVALID_IMAGE_PATH');
  }
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20_000);
  try {
    const response=await fetch(`https://cdn.readdetectiveconan.com${path}`,{redirect:'error',signal:controller.signal,headers:{Referer:'https://mangapill.com/'}});
    const type=response.headers.get('content-type')??'';
    if(!response.ok || !type.startsWith('image/')) throw new ProviderGatewayError('Source image unavailable.',502);
    const reader=response.body?.getReader();if(!reader)throw new ProviderGatewayError('Empty source image.',502);
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>10_000_000){await reader.cancel();throw new ProviderGatewayError('Source image exceeds size limit.',502);}chunks.push(value);}
    res.setHeader('Content-Type',type);res.setHeader('Cache-Control','public, max-age=3600');res.send(Buffer.concat(chunks));
  } finally {clearTimeout(timer);}
}
