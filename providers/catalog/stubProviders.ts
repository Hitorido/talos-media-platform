import { createCatalogProvider } from '@/providers/catalog/createCatalogProvider';
import type { MediaProvider } from '@/providers/types';

const scraperBackend = {
  executionMode: 'scraper-backend' as const,
  backendRequired: true,
  backendKey: 'scraper' as const,
};

/** Scraper-based sources that need a self-hosted backend (Kotatsu/Tachiyomi extensions). */
export const scraperBackendProviders: MediaProvider[] = [
  createCatalogProvider({
    id: 'stub-mangatown',
    name: 'MangaTown',
    website: 'https://mangatown.com',
    mediaTypes: ['manga', 'manhwa', 'manhua'],
    status: 'requires-backend',
    statusNote:
      'Scraper-based source. Not directly accessible from Expo — requires a self-hosted scraper backend.',
    ...scraperBackend,
  }),
  createCatalogProvider({
    id: 'stub-mangatx',
    name: 'MangaTX',
    website: 'https://mangatx.cc',
    mediaTypes: ['manhwa', 'manhua'],
    status: 'requires-backend',
    statusNote:
      'Scraper-based source. Requires a self-hosted scraper backend (e.g. Consumet fork).',
    ...scraperBackend,
  }),
  createCatalogProvider({
    id: 'stub-kaliscan',
    name: 'KaliScan',
    website: 'https://kaliscan.io',
    mediaTypes: ['manhwa', 'manhua'],
    status: 'requires-backend',
    statusNote: 'Scraper-based source. Requires a self-hosted scraper backend.',
    ...scraperBackend,
  }),
  createCatalogProvider({
    id: 'stub-mangageko',
    name: 'MangaGeko',
    mediaTypes: ['manga', 'manhwa'],
    status: 'requires-backend',
    statusNote: 'Scraper-based source. Requires a self-hosted scraper backend.',
    ...scraperBackend,
  }),
  createCatalogProvider({
    id: 'stub-mangajinx',
    name: 'MangaJinx',
    mediaTypes: ['manga', 'manhwa'],
    status: 'requires-backend',
    statusNote: 'Scraper-based source. Requires a self-hosted scraper backend.',
    ...scraperBackend,
  }),
  createCatalogProvider({
    id: 'stub-demonicscans',
    name: 'Demonic Scans',
    mediaTypes: ['manhwa', 'manhua'],
    status: 'requires-backend',
    statusNote: 'Scraper-based source. Requires a self-hosted scraper backend.',
    ...scraperBackend,
  }),
  createCatalogProvider({
    id: 'stub-bato',
    name: 'Bato.to',
    website: 'https://bato.to',
    mediaTypes: ['manga', 'manhwa', 'manhua'],
    status: 'requires-backend',
    statusNote: 'Scraper-based source. Requires a self-hosted scraper backend.',
    ...scraperBackend,
  }),
  createCatalogProvider({
    id: 'stub-reaperscans',
    name: 'Reaper Scans',
    mediaTypes: ['manhwa', 'manhua'],
    status: 'requires-backend',
    statusNote: 'Scraper-based source. Requires a self-hosted scraper backend.',
    ...scraperBackend,
  }),
  createCatalogProvider({
    id: 'stub-vortexscan',
    name: 'Vortex Scan',
    mediaTypes: ['manhwa', 'manhua'],
    status: 'requires-backend',
    statusNote: 'Scraper-based source. Requires a self-hosted scraper backend.',
    ...scraperBackend,
  }),
];

/** Sources with no viable integration path at this time. */
export const unsupportedProviders: MediaProvider[] = [
  createCatalogProvider({
    id: 'stub-nhentai',
    name: 'nhentai',
    mediaTypes: ['manga'],
    status: 'unsupported',
    statusNote: 'Not integrated. Adult content source excluded from catalog.',
    executionMode: 'scraper-backend',
  }),
  createCatalogProvider({
    id: 'stub-linewebtoon',
    name: 'LINE WEBTOON',
    website: 'https://www.webtoons.com',
    mediaTypes: ['manhwa'],
    status: 'requires-configuration',
    statusNote: 'Official platform. Requires official API or browser integration.',
    executionMode: 'browser',
  }),
];

/** Planned providers that need backend or configuration before they can work. */
export const plannedProviders: MediaProvider[] = [
  createCatalogProvider({
    id: 'stub-lncrawl-novels',
    name: 'Light Novel Crawler (reference)',
    website: 'https://github.com/lncrawl/lightnovel-crawler',
    mediaTypes: ['novel'],
    status: 'requires-backend',
    statusNote:
      'Reference only. Wire a self-hosted lncrawl/compatible API to Novel Backend Gateway (NOVEL_GATEWAY_URL or Sources novel URL). Not implemented as an in-app scraper.',
    executionMode: 'scraper-backend',
    backendRequired: true,
    backendKey: 'novel',
  }),
  createCatalogProvider({
    id: 'stub-novel-api',
    name: 'novel-api (reference)',
    website: 'https://github.com/Kevin-Umali/novel-api',
    mediaTypes: ['novel'],
    status: 'requires-backend',
    statusNote:
      'Reference only. Point Novel Backend Gateway at a self-hosted novel-api-compatible service when available.',
    executionMode: 'scraper-backend',
    backendRequired: true,
    backendKey: 'novel',
  }),
];

/** Candidate sources from the catalog list — not yet implemented or verified. */
export const candidateProviders: MediaProvider[] = [
  'Mangalon',
  'Banana Manga',
  'Gourmet Scans',
  'MangaRead',
  'MangaKiss',
  'ToonClash',
  'Manhwa Hot',
  'Platinum Scan',
  'ManhwaTop',
  'ZinManga',
  'MangaCute',
  'MangaNelo',
  'Arcreligh',
  'NightScan',
  'ShojoScan',
  'WitchScan',
  'MangaGojo',
  'BookManga',
  'VioletScan',
  'RoliaScan',
  'HotComics',
  'Comix',
].map((name) =>
  createCatalogProvider({
    id: `candidate-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    mediaTypes: ['manga', 'manhwa', 'manhua'],
    status: 'candidate',
    statusNote:
      'Catalog candidate. Not yet implemented — may require a scraper backend depending on the source.',
    executionMode: 'scraper-backend',
    backendRequired: true,
    backendKey: 'scraper',
  }),
);

export const stubProviders: MediaProvider[] = [
  ...scraperBackendProviders,
  ...unsupportedProviders,
  ...plannedProviders,
  ...candidateProviders,
];
