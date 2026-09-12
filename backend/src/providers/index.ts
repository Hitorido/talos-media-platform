import { consumetProviderAdapter } from './consumet/adapter.js';
import { novelProviderAdapter } from './novel/adapter.js';
import { registerProvider } from './registry.js';
import { scraperProviderAdapter } from './scraper/adapter.js';

let initialized = false;

/**
 * Registers all backend content provider adapters into the unified registry.
 * Call once at process startup (idempotent).
 */
export function initializeBackendProviders(): void {
  if (initialized) return;

  registerProvider(novelProviderAdapter);
  registerProvider(consumetProviderAdapter);
  registerProvider(scraperProviderAdapter);

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
export type {
  BackendMediaType,
  BackendProviderCapability,
  BackendProviderDefinition,
  BackendProviderStatus,
  ContentProviderAdapter,
} from './types.js';
export { ProviderGatewayError } from './types.js';
