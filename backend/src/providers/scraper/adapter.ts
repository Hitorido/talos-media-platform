import type { ContentProviderAdapter } from '../types.js';
import { ProviderGatewayError } from '../types.js';

/**
 * Registry slot for future controlled scraper backends.
 * Source-specific adapters must be registered separately and verified first.
 */
export const scraperProviderAdapter: ContentProviderAdapter = {
  definition: {
    id: 'proxy-scraper',
    name: 'Scraper Backend Proxy',
    description:
      'Placeholder for a controlled scraper backend.',
    mediaTypes: ['manga', 'manhwa', 'manhua'],
    capabilities: ['search', 'details', 'chapters', 'pages'],
    status: 'planned',
    statusNote: 'Not implemented. Use a verified source-specific adapter instead.',
    enabledByDefault: false,
    configKey: 'scraper',
  },

  async search() {
    throw new ProviderGatewayError(
      'Use specific provider adapters (e.g., asurascans) instead of the generic scraper adapter.',
      400,
      'USE_SPECIFIC_PROVIDER',
    );
  },
};
