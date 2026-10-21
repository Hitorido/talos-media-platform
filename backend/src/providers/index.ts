import { animeXinAdapter } from './animexin/adapter.js';
import { ao3Adapter } from './ao3/adapter.js';
import { asuraScansAdapter } from './asurascans/adapter.js';
import { demonicScansAdapter } from './demonicscans/adapter.js';
import { donghuaStreamAdapter } from './donghuastream/adapter.js';
import extensionCatalog from './extensions/index.json';
import { loadReviewedExtensions } from './extensions/loader.js';
import { gdScansAdapter } from './gdscans/adapter.js';
import { kaliScanAdapter, mangaJinxAdapter } from './kaliscan/adapter.js';
import { mangaPillAdapter } from './mangapill/adapter.js';
import { mangaTownAdapter } from './mangatown/adapter.js';
import { manhuaPlusAdapter } from './manhuaplus/adapter.js';
import { narouProviderAdapter } from './narou/adapter.js';
import { novelProviderAdapter } from './novel/adapter.js';
import { novelArrowAdapter } from './novelarrow/adapter.js';
import { novelCodexAdapter } from './novelcodex/adapter.js';
import { novelPingAdapter } from './novelping/adapter.js';
import { registerProvider } from './registry.js';
import { royalRoadAdapter } from './royalroad/adapter.js';
import { scraperProviderAdapter } from './scraper/adapter.js';
import { suwayomiAdapter } from './suwayomi/adapter.js';
import { wanderingInnAdapter } from './wanderinginn/adapter.js';
import { weebCentralAdapter } from './weebcentral/adapter.js';

import { comiclandAdapter } from './comicland/adapter.js';
import { comixAdapter } from './comix/adapter.js';
import { mgreadAdapter } from './mgread/adapter.js';
import { nyxScansAdapter } from './nyxscans/adapter.js';
import { omegaScansAdapter } from './omegascans/adapter.js';
import { roliaScanAdapter } from './roliascan/adapter.js';
import { toonGodAdapter } from './toongod/adapter.js';
import { toonilyAdapter } from './toonily/adapter.js';
import { valirScansAdapter } from './valirscans/adapter.js';
import { vortexScansAdapter } from './vortexscans/adapter.js';

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
  registerProvider(suwayomiAdapter);
  registerProvider(ao3Adapter);
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
  registerProvider(valirScansAdapter);
  registerProvider(mgreadAdapter);
  registerProvider(comixAdapter);
  registerProvider(nyxScansAdapter);
  registerProvider(vortexScansAdapter);
  registerProvider(roliaScanAdapter);
  registerProvider(toonGodAdapter);
  registerProvider(comiclandAdapter);
  registerProvider(omegaScansAdapter);
  registerProvider(toonilyAdapter);

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
    unregisterProvider
} from './registry.js';
export { ProviderGatewayError } from './types.js';
export type {
    BackendMediaType,
    BackendProviderCapability,
    BackendProviderDefinition,
    BackendProviderStatus,
    ContentProviderAdapter
} from './types.js';

