import { ENV } from '../../config/env.js';
import type { ContentProviderAdapter } from '../types.js';
import { ProviderGatewayError } from '../types.js';

const PUBLIC_CONSUMET = 'https://api.consumet.org';

function resolveConsumetStatus() {
  const configured = ENV.CONSUMET_BASE_URL.trim();
  if (!configured) {
    return {
      status: 'requires-configuration' as const,
      note: 'Set CONSUMET_BASE_URL to a self-hosted Consumet instance. Public api.consumet.org returns HTTP 451.',
    };
  }
  if (configured.replace(/\/$/, '') === PUBLIC_CONSUMET) {
    return {
      status: 'unavailable' as const,
      note: 'Public api.consumet.org is unavailable (HTTP 451). Use a self-hosted Consumet URL.',
    };
  }
  return {
    status: 'limited' as const,
    note: 'Custom Consumet URL configured. Adapter methods are reserved for gradual integration; not claimed fully working yet.',
  };
}

const consumetMeta = resolveConsumetStatus();

/**
 * Backend Consumet proxy adapter foundation.
 * Does not scrape sites and does not claim the public Consumet API works.
 */
export const consumetProviderAdapter: ContentProviderAdapter = {
  definition: {
    id: 'proxy-consumet',
    name: 'Consumet Proxy',
    description:
      'Optional self-hosted Consumet-compatible proxy for manga/anime. Public Consumet is unavailable.',
    mediaTypes: ['manga', 'manhwa', 'manhua', 'anime'],
    capabilities: ['search', 'details', 'chapters', 'pages', 'episodes', 'streaming'],
    status: consumetMeta.status,
    statusNote: consumetMeta.note,
    enabledByDefault: false,
    configKey: 'consumet',
  },

  async search() {
    throw new ProviderGatewayError(
      consumetMeta.note,
      consumetMeta.status === 'unavailable' ? 503 : 501,
      consumetMeta.status === 'unavailable' ? 'PROVIDER_UNAVAILABLE' : 'REQUIRES_CONFIGURATION',
    );
  },

  async getDetails() {
    throw new ProviderGatewayError(
      'Consumet details are not enabled until a verified self-hosted endpoint is integrated.',
      501,
      'NOT_IMPLEMENTED',
    );
  },

  async getChapters() {
    throw new ProviderGatewayError(
      'Consumet chapters are not enabled until a verified self-hosted endpoint is integrated.',
      501,
      'NOT_IMPLEMENTED',
    );
  },

  async getPages() {
    throw new ProviderGatewayError(
      'Consumet pages are not enabled until a verified self-hosted endpoint is integrated.',
      501,
      'NOT_IMPLEMENTED',
    );
  },

  async getEpisodes() {
    throw new ProviderGatewayError(
      'Consumet episodes are not enabled until a verified self-hosted endpoint is integrated.',
      501,
      'NOT_IMPLEMENTED',
    );
  },

  async getPlaybackSource() {
    throw new ProviderGatewayError(
      'Consumet streaming is not enabled. Public Consumet remains unavailable (HTTP 451).',
      501,
      'NOT_IMPLEMENTED',
    );
  },
};
