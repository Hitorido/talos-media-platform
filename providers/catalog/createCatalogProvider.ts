import type { MediaProvider } from '@/providers/types';
import type { ProviderExecutionMode, ProviderMediaType, ProviderStatus } from '@/types/provider';

export type CatalogProviderConfig = {
  id: string;
  name: string;
  website?: string;
  mediaTypes: ProviderMediaType[];
  status: ProviderStatus;
  statusNote: string;
  executionMode: ProviderExecutionMode;
  backendRequired?: boolean;
  backendKey?: 'consumet' | 'scraper' | 'novel';
};

export function createCatalogProvider(config: CatalogProviderConfig): MediaProvider {
  return {
    definition: {
      id: config.id,
      name: config.name,
      website: config.website,
      description: config.statusNote,
      mediaTypes: config.mediaTypes,
      capabilities: [],
      status: config.status,
      statusNote: config.statusNote,
      executionMode: config.executionMode,
      backendRequired: config.backendRequired,
      backendKey: config.backendKey,
      health: {},
    },
    async search() {
      return [];
    },
  };
}
