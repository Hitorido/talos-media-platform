import { loadProviderTs } from './phase6.5-test-loader.mjs';

const types = loadProviderTs('types/provider.ts');
const activeSource = loadProviderTs('utils/activeSource.ts');
const novelLanguage = loadProviderTs('utils/novelLanguage.ts');
const providerSearch = loadProviderTs('services/providerSearch.ts');
const comicFormat = loadProviderTs('utils/comicFormat.ts');
const registryMod = loadProviderTs('providers/registry.ts');

// Minimal stores.
const providerStore = {
  useProviderStore: {
    getState: () => ({
      enabled: Object.fromEntries(
        registryMod.providerRegistry.list().map((p) => [p.definition.id, true]),
      ),
      getPreferredProvider: () => undefined,
    }),
  },
};
const healthStore = {
  useProviderHealthStore: {
    getState: () => ({ recordSuccess() {}, recordFailure() {} }),
  },
};

// Load every registered provider module the registry needs. providers/index.ts imports
// many modules; instead register via providers/index with its own deps.
const contentDeps = {
  '@/lib/apiConfig': {
    getApiBaseUrl: () => process.env.API_BASE || 'https://talos-media-platform.onrender.com',
  },
  '@/providers': await loadIndexProviders(),
  '@/providers/types': loadProviderTs('providers/types.ts'),
  '@/services/offlineCatalog': {},
  '@/services/offlineResolver': {},
  '@/services/providerSearch': providerSearch,
  '@/stores/backendConfigStore': {
    useBackendConfigStore: { getState: () => ({ backendUrls: {} }) },
  },
  '@/stores/providerHealthStore': healthStore,
  '@/stores/providerStore': providerStore,
  '@/types/provider': types,
  '@/utils/activeSource': activeSource,
  '@/utils/novelLanguage': novelLanguage,
  '@/utils/comicFormat': comicFormat,
};

async function loadIndexProviders() {
  // providers/index.ts pulls in a lot; stub the leaf modules it imports.
  const registry = registryMod;
  const deps = {
    '@/providers/backend-content/anime': loadProviderTs('providers/backend-content/anime.ts', {
      '@/lib/apiConfig': {
        getApiBaseUrl: () => process.env.API_BASE || 'https://talos-media-platform.onrender.com',
      },
      '@/services/api/client': {
        apiRequestWithWake: async (path) => {
          throw new Error('no net ' + path);
        },
      },
      '@/types/provider': types,
    }),
    '@/providers/backend-content': {
      backendComicProvider: (id, name) => ({
        definition: {
          id,
          name,
          mediaTypes: ['manga'],
          capabilities: ['search'],
          status: 'working',
        },
        search: async () => {
          throw new Error('net down');
        },
      }),
      backendNovelProvider: (id, name) => ({
        definition: {
          id,
          name,
          mediaTypes: ['novel'],
          capabilities: ['search'],
          status: 'limited',
        },
        search: async () => {
          throw new Error('net down');
        },
      }),
    },
    '@/providers/animeparadise': {
      animeParadiseProvider: {
        definition: {
          id: 'animeparadise',
          name: 'AP',
          mediaTypes: ['anime'],
          capabilities: ['search'],
          status: 'working',
        },
        search: async () => [],
      },
    },
    '@/providers/anilist': loadProviderTs('providers/anilist/index.ts', {
      '@/providers/anilist/client': loadProviderTs('providers/anilist/client.ts'),
      '@/types/provider': types,
    }),
    '@/providers/builtin-mock': {
      builtinMockProvider: {
        definition: {
          id: 'builtin-mock',
          name: 'Mock',
          mediaTypes: ['manga', 'anime', 'novel'],
          capabilities: ['search'],
          status: 'working',
        },
        search: async () => [],
      },
    },
    '@/providers/jikan': loadProviderTs('providers/jikan/index.ts', {
      '@/providers/jikan/client': loadProviderTs('providers/jikan/client.ts'),
      '@/types/provider': types,
    }),
    '@/providers/kitsu': loadProviderTs('providers/kitsu/index.ts', {
      '@/providers/kitsu/client': loadProviderTs('providers/kitsu/client.ts'),
      '@/types/provider': types,
    }),
    '@/providers/mangadex': loadProviderTs('providers/mangadex/index.ts', {
      '@/providers/mangadex/client': loadProviderTs('providers/mangadex/client.ts'),
      '@/types/provider': types,
      '@/utils/comicFormat': comicFormat,
    }),
    '@/providers/narou': loadProviderTs('providers/narou/index.ts', {
      '@/services/api/client': {
        apiRequest: async () => {
          throw new Error('net down');
        },
      },
      '@/types/provider': types,
    }),
    '@/providers/novel-backend': loadProviderTs('providers/novel-backend/index.ts', {
      '@/lib/apiConfig': { getApiBaseUrl: () => 'https://x.invalid' },
      '@/stores/backendConfigStore': {
        useBackendConfigStore: { getState: () => ({ backendUrls: {} }) },
      },
      '@/types/provider': types,
    }),
    '@/providers/registry': registry,
  };
  return loadProviderTs('providers/index.ts', deps);
}

const service = loadProviderTs('services/contentService.ts', contentDeps);

console.log(
  'providers:',
  (await loadIndexProviders()).providerRegistry
    .list()
    .map((p) => p.definition.id)
    .join(', '),
);

const t0 = Date.now();
const res = await service.unifiedSearch('naruto', 'all');
console.log('elapsed', Date.now() - t0, 'ms; results', res.results.length);
console.log(
  res.results
    .slice(0, 10)
    .map((r) => `${r.type}:${r.title} (${r.providerId})`)
    .join('\n'),
);
