import { sourceText } from '../shared/sourceHttp.js';
import { createAnimeXinAdapter } from './core.js';
export * from './core.js';
export const animeXinAdapter = createAnimeXinAdapter(sourceText);
