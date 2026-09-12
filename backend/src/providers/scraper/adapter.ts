import type { ContentProviderAdapter } from '../types.js';
import { ProviderGatewayError } from '../types.js';

/**
 * Planned scraper-backend adapter slot.
 * Scraping stays out of Expo; this adapter is a registry placeholder until a trusted backend exists.
 */
export const scraperProviderAdapter: ContentProviderAdapter = {
  definition: {
    id: 'proxy-scraper',
    name: 'Scraper Backend Proxy',
    description:
      'Future scraper-backend adapter slot for comic sources that require server-side extraction.',
    mediaTypes: ['manga', 'manhwa', 'manhua'],
    capabilities: ['search', 'details', 'chapters', 'pages'],
    status: 'planned',
    statusNote:
      'Not implemented. Do not enable until a controlled scraper backend is configured and tested.',
    enabledByDefault: false,
    configKey: 'scraper',
  },

  async search() {
    throw new ProviderGatewayError(
      'Scraper backend proxy is planned and not implemented.',
      501,
      'PROVIDER_PLANNED',
    );
  },
};
