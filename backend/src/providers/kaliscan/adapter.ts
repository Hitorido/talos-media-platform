import { sourceText } from '../shared/sourceHttp.js';
import { createKaliscanAdapter } from './core.js';
export const kaliScanAdapter = createKaliscanAdapter(
  'kaliscan',
  'Kaliscan',
  'https://kaliscan.io',
  sourceText,
);
export const mangaJinxAdapter = createKaliscanAdapter(
  'mangajinx',
  'MangaJinx',
  'https://mgjinx.com',
  sourceText,
);
