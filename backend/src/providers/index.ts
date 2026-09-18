import { novelCodexAdapter } from './novelcodex/adapter.js';
import { novelArrowAdapter } from './novelarrow/adapter.js';
import { mangaPillAdapter } from './mangapill/adapter.js';
import { weebCentralAdapter } from './weebcentral/adapter.js';
import { asuraScansAdapter } from './asurascans/adapter.js';
import { consumetProviderAdapter } from './consumet/adapter.js';
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

  registerProvider(weebCentralAdapter);
  registerProvider(mangaPillAdapter);
  registerProvider(novelArrowAdapter);
  registerProvider(novelCodexAdapter);
  registerProvider(novelProviderAdapter);
  registerProvider(narouProviderAdapter);
  registerProvider(consumetProviderAdapter);
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

