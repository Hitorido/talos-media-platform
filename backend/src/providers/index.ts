import extensionCatalog from './extensions/index.json';
import { loadReviewedExtensions } from './extensions/loader.js';
import { animeXinAdapter } from './animexin/adapter.js';
import { manhuaPlusAdapter } from './manhuaplus/adapter.js';
import { wanderingInnAdapter } from './wanderinginn/adapter.js';
import { royalRoadAdapter } from './royalroad/adapter.js';
import { donghuaStreamAdapter } from './donghuastream/adapter.js';
import { novelPingAdapter } from './novelping/adapter.js';
import { mangaTownAdapter } from './mangatown/adapter.js';
import { demonicScansAdapter } from './demonicscans/adapter.js';
import { gdScansAdapter } from './gdscans/adapter.js';
import { kaliScanAdapter, mangaJinxAdapter } from './kaliscan/adapter.js';
import { novelCodexAdapter } from './novelcodex/adapter.js';
import { novelArrowAdapter } from './novelarrow/adapter.js';
import { mangaPillAdapter } from './mangapill/adapter.js';
import { weebCentralAdapter } from './weebcentral/adapter.js';
import { asuraScansAdapter } from './asurascans/adapter.js';
import { novelProviderAdapter } from './novel/adapter.js';
import { narouProviderAdapter } from './narou/adapter.js';
import { registerProvider } from './registry.js';
import { scraperProviderAdapter } from './scraper/adapter.js';

let initialized = false;

/**
 * Registers all backend content provider adapters into the unified registry.
 * Call once at process startup (idempotent).
 */
export function initializeBackendProviders(): void {
  if (initialized) return;

  for (const adapter of loadReviewedExtensions(extensionCatalog, {
    animexin: animeXinAdapter,
    manhuaplus: manhuaPlusAdapter,
    novelping: novelPingAdapter,
  }))
    registerProvider(adapter);
  registerProvider(wanderingInnAdapter);
  registerProvider(weebCentralAdapter);
  registerProvider(mangaPillAdapter);
  registerProvider(mangaTownAdapter);
  registerProvider(gdScansAdapter);
  registerProvider(demonicScansAdapter);
  registerProvider(novelArrowAdapter);
  registerProvider(novelCodexAdapter);
  registerProvider(royalRoadAdapter);
  registerProvider(donghuaStreamAdapter);
  registerProvider(kaliScanAdapter);
  registerProvider(mangaJinxAdapter);
  registerProvider(novelProviderAdapter);
  registerProvider(narouProviderAdapter);
  registerProvider(scraperProviderAdapter);
  registerProvider(asuraScansAdapter);

  initialized = true;
}

export { contentGateway } from './contentGateway.js';
export {
  disableProvider,
  enableProvider,
  findProvidersByCapability,
  findProvidersByMediaType,
  getProvider,
  getProviderHealth,
  getProviderStatus,
  listProviderAdapters,
  listProviders,
  listProviderSummaries,
  registerProvider,
  unregisterProvider,
} from './registry.js';
export { ProviderGatewayError } from './types.js';
export type {
  BackendMediaType,
  BackendProviderCapability,
  BackendProviderDefinition,
  BackendProviderStatus,
  ContentProviderAdapter,
} from './types.js';
