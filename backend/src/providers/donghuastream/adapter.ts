import { sourceText } from '../shared/sourceHttp.js';
import { createDonghuaStreamAdapter } from './core.js';
export * from './core.js';
export const donghuaStreamAdapter = createDonghuaStreamAdapter(sourceText);
