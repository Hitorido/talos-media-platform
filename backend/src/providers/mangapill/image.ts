import type { Request, Response } from 'express';
import { imageProxy } from '../../media/proxy.js';
/** Backward-compatible URL backed by the bounded media proxy. */
export async function mangaPillImage(req: Request, res: Response) {
  req.params.providerId = 'mangapill';
  return imageProxy(req, res);
}
