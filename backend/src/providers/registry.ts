import type {
  BackendMediaType,
  BackendProviderCapability,
  BackendProviderDefinition,
  BackendProviderHealth,
  BackendProviderStatus,
  ContentProviderAdapter,
} from './types.js';

type RuntimeState = {
  enabled: boolean;
  statusOverride?: BackendProviderStatus;
  health: BackendProviderHealth;
};

const adapters = new Map<string, ContentProviderAdapter>();
const runtime = new Map<string, RuntimeState>();

function ensureRuntime(providerId: string): RuntimeState {
  let state = runtime.get(providerId);
  if (!state) {
    const adapter = adapters.get(providerId);
    state = {
      enabled: adapter?.definition.enabledByDefault !== false,
      health: {},
    };
    runtime.set(providerId, state);
  }
  return state;
}

export function registerProvider(adapter: ContentProviderAdapter): void {
  adapters.set(adapter.definition.id, adapter);
  if (!runtime.has(adapter.definition.id)) {
    runtime.set(adapter.definition.id, {
      enabled: adapter.definition.enabledByDefault !== false,
      health: {},
    });
  }
}

export function unregisterProvider(providerId: string): boolean {
  runtime.delete(providerId);
  return adapters.delete(providerId);
}

export function getProvider(providerId: string): ContentProviderAdapter | undefined {
  return adapters.get(providerId);
}

export function listProviders(): BackendProviderDefinition[] {
  return Array.from(adapters.values()).map((adapter) => ({
    ...adapter.definition,
    status: getProviderStatus(adapter.definition.id),
  }));
}

export function findProvidersByMediaType(mediaType: BackendMediaType): ContentProviderAdapter[] {
  return Array.from(adapters.values()).filter((adapter) =>
    adapter.definition.mediaTypes.includes(mediaType),
  );
}

export function findProvidersByCapability(
  capability: BackendProviderCapability,
): ContentProviderAdapter[] {
  return Array.from(adapters.values()).filter((adapter) =>
    adapter.definition.capabilities.includes(capability),
  );
}

export function enableProvider(providerId: string): void {
  if (!adapters.has(providerId)) {
    throw new Error(`Unknown provider "${providerId}".`);
  }
  ensureRuntime(providerId).enabled = true;
}

export function disableProvider(providerId: string): void {
  if (!adapters.has(providerId)) {
    throw new Error(`Unknown provider "${providerId}".`);
  }
  ensureRuntime(providerId).enabled = false;
}

export function isProviderEnabled(providerId: string): boolean {
  if (!adapters.has(providerId)) return false;
  return ensureRuntime(providerId).enabled;
}

export function getProviderStatus(providerId: string): BackendProviderStatus {
  const adapter = adapters.get(providerId);
  if (!adapter) return 'unavailable';
  const state = ensureRuntime(providerId);
  if (state.statusOverride) return state.statusOverride;
  // Keep configuration/honest status even when disabled; use `enabled` separately.
  return adapter.definition.status;
}

export function setProviderStatusOverride(
  providerId: string,
  status: BackendProviderStatus | undefined,
): void {
  if (!adapters.has(providerId)) {
    throw new Error(`Unknown provider "${providerId}".`);
  }
  ensureRuntime(providerId).statusOverride = status;
}

export function getProviderHealth(providerId: string): BackendProviderHealth {
  return { ...ensureRuntime(providerId).health };
}

export function recordProviderSuccess(providerId: string, durationMs: number): void {
  const state = ensureRuntime(providerId);
  state.health = {
    ...state.health,
    lastSuccessAt: Date.now(),
    lastResponseMs: durationMs,
    lastError: undefined,
  };
}

export function recordProviderFailure(
  providerId: string,
  message: string,
  durationMs: number,
): void {
  const state = ensureRuntime(providerId);
  state.health = {
    ...state.health,
    lastFailureAt: Date.now(),
    lastResponseMs: durationMs,
    lastError: message,
  };
}

export function listProviderSummaries() {
  return Array.from(adapters.values()).map((adapter) => {
    const id = adapter.definition.id;
    return {
      ...adapter.definition,
      status: getProviderStatus(id),
      enabled: isProviderEnabled(id),
      health: getProviderHealth(id),
    };
  });
}

/** @deprecated Prefer listProviders / listProviderSummaries */
export function listProviderAdapters(): BackendProviderDefinition[] {
  return listProviders();
}

/** @deprecated Prefer getProvider */
export function getProviderAdapter(id: string): ContentProviderAdapter | undefined {
  return getProvider(id);
}

/** @deprecated Prefer registerProvider */
export function registerProviderAdapter(adapter: ContentProviderAdapter): void {
  registerProvider(adapter);
}
