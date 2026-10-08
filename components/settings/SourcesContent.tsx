import { getApiBaseUrl } from '@/lib/apiConfig';
import { wakeBackend } from '@/services/api/client';
import { useCallback, useState } from 'react';
import { Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SourceLogo } from '@/components/settings/SourceLogo';
import { Button, Input, PopPressable, Text } from '@/components/ui';
import { initializeProviders, providerRegistry } from '@/providers';
import { fetchProviderHealth } from '@/services/api/backendApi';
import { useBackendConfigStore, type BackendUrlKey } from '@/stores/backendConfigStore';
import { useProviderHealthStore } from '@/stores/providerHealthStore';
import { useProviderStore } from '@/stores/providerStore';
import type { ProviderExecutionMode, ProviderStatus } from '@/types/provider';

const statusLabels: Record<ProviderStatus, string> = {
  candidate: 'Candidate',
  working: 'Working',
  limited: 'Limited',
  unavailable: 'Unavailable',
  broken: 'Broken',
  unsupported: 'Unsupported',
  'requires-configuration': 'Requires Configuration',
  'requires-backend': 'Requires Backend',
  disabled: 'Disabled',
};

const executionModeLabels: Record<ProviderExecutionMode, string> = {
  'direct-api': 'Direct API',
  'public-api': 'Public API',
  'backend-api': 'Backend API',
  'scraper-backend': 'Scraper Backend',
  browser: 'Browser / WebView',
  'user-configured': 'User Configured',
  local: 'Local',
};

const backendFields: { key: BackendUrlKey; label: string; hint: string }[] = [
  {
    key: 'novel',
    label: 'Novel Backend URL',
    hint: 'Compatible novel API base. Leave empty to use this app Express /api/novels gateway.',
  },
  {
    key: 'consumet',
    label: 'Consumet Base URL',
    hint: 'Self-hosted Consumet API. Public api.consumet.org returns HTTP 451.',
  },
  { key: 'scraper', label: 'Scraper Backend URL', hint: 'Optional future comic scraper backend.' },
];

function statusColor(status: ProviderStatus): string {
  if (status === 'working') return 'text-emerald-500';
  if (status === 'limited') return 'text-amber-500';
  if (status === 'requires-configuration' || status === 'requires-backend') return 'text-blue-400';
  return 'text-neutral-400';
}

function formatHealthTimestamp(timestamp?: number): string | null {
  return timestamp ? new Date(timestamp).toLocaleString() : null;
}

export function SourcesContent() {
  initializeProviders();
  const providers = providerRegistry.list();
  const enabledMap = useProviderStore((state) => state.enabled);
  const setProviderEnabled = useProviderStore((state) => state.setProviderEnabled);
  const setPreferredProvider = useProviderStore((state) => state.setPreferredProvider);
  const getPreferredProvider = useProviderStore((state) => state.getPreferredProvider);
  const getProviderStatus = useProviderStore((state) => state.getProviderStatus);
  const backendUrls = useBackendConfigStore((state) => state.backendUrls);
  const setBackendUrl = useBackendConfigStore((state) => state.setBackendUrl);
  const isBackendConfigured = useBackendConfigStore((state) => state.isBackendConfigured);
  const healthByProvider = useProviderHealthStore((state) => state.healthByProvider);
  const setHealth = useProviderHealthStore((state) => state.setHealth);
  const [draftUrls, setDraftUrls] = useState<Partial<Record<BackendUrlKey, string>>>({});
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthMessage, setHealthMessage] = useState<string | null>(null);

  const [serverEnabled, setServerEnabled] = useState<Record<string, boolean>>({});
  const refreshBackendHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthMessage(null);
    try {
      await wakeBackend();
      const response = await fetchProviderHealth();
      setServerEnabled(Object.fromEntries(response.providers.map((p) => [p.id, p.enabled])));
      response.providers.forEach((provider) => {
        if (provider.health) setHealth(provider.id, provider.health);
      });
      setHealthMessage(`Checked ${response.providers.length} backend providers.`);
    } catch (error) {
      setHealthMessage(error instanceof Error ? error.message : 'Unable to check backend health.');
    } finally {
      setHealthLoading(false);
    }
  }, [setHealth]);

  const grouped = {
    anime: providers.filter((provider) => provider.definition.mediaTypes.includes('anime')),
    manga: providers.filter((provider) =>
      provider.definition.mediaTypes.some((type) => ['manga', 'manhwa', 'manhua'].includes(type)),
    ),
    novel: providers.filter((provider) => provider.definition.mediaTypes.includes('novel')),
  };

  return (
    <View className="gap-6">
      <View className="gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text variant="label">Backend Endpoints</Text>
        <Text variant="caption" tone="muted">
          Talos API: {getApiBaseUrl()}
        </Text>
        <Text variant="caption" tone="muted">
          Configure optional self-hosted backends. Novel Backend Gateway uses the Novel URL when
          set; otherwise it calls this app&apos;s Express /api/novels proxy (requires
          NOVEL_GATEWAY_URL).
        </Text>
        <Button
          label="Refresh backend health"
          variant="outline"
          size="sm"
          loading={healthLoading}
          onPress={refreshBackendHealth}
        />
        {healthMessage ? (
          <Text
            variant="caption"
            tone={healthMessage.startsWith('Checked') ? 'success' : 'destructive'}
          >
            {healthMessage}
          </Text>
        ) : null}
        {backendFields.map((field) => {
          const saved = backendUrls[field.key] ?? '';
          const value = draftUrls[field.key] ?? saved;
          return (
            <View key={field.key} className="gap-2">
              <Text variant="caption" className="font-semibold">
                {field.label}
              </Text>
              <Text variant="caption" tone="muted">
                {field.hint}
              </Text>
              <Input
                value={value}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="https://example.com"
                onChangeText={(text) =>
                  setDraftUrls((current) => ({ ...current, [field.key]: text }))
                }
              />
              <View className="flex-row gap-2">
                <Button
                  label="Save"
                  onPress={() => {
                    setBackendUrl(field.key, value.trim() || null);
                    setDraftUrls((current) => {
                      const next = { ...current };
                      delete next[field.key];
                      return next;
                    });
                  }}
                />
                {saved ? (
                  <Button
                    label="Clear"
                    variant="secondary"
                    onPress={() => {
                      setBackendUrl(field.key, null);
                      setDraftUrls((current) => ({ ...current, [field.key]: '' }));
                    }}
                  />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {(
        [
          ['ANIME', grouped.anime],
          ['MANGA / MANHWA / MANHUA', grouped.manga],
          ['NOVELS', grouped.novel],
        ] as const
      ).map(([label, items]) =>
        items.length ? (
          <View key={label} className="gap-3">
            <Text variant="caption" tone="muted" className="font-semibold uppercase tracking-wide">
              {label}
            </Text>
            {items.map((provider) => {
              const def = provider.definition;
              const enabled = enabledMap[def.id] === true;
              const status = getProviderStatus(def.id);
              const preferred = getPreferredProvider(def.mediaTypes[0]) === def.id;
              const canToggle = def.capabilities.length > 0;
              const health = healthByProvider[def.id];
              const backendConfigured = def.backendKey
                ? isBackendConfigured(def.backendKey)
                : false;
              const expanded = expandedProviders[def.id] ?? false;

              return (
                <View
                  key={def.id}
                  className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <View className="flex-row items-center gap-3 p-3">
                    <PopPressable
                      onPress={() =>
                        setExpandedProviders((current) => ({ ...current, [def.id]: !expanded }))
                      }
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      className="flex-1 flex-row items-center gap-3"
                    >
                      <SourceLogo name={def.name} website={def.website} />
                      <View className="flex-1 gap-0.5">
                        <Text variant="label" numberOfLines={1}>
                          {def.name}
                        </Text>
                        <Text
                          variant="caption"
                          className={statusColor(enabled ? status : 'disabled')}
                        >
                          {enabled && serverEnabled[def.id] === false
                            ? 'Unavailable on server'
                            : statusLabels[enabled ? status : 'disabled']}
                        </Text>
                      </View>
                      <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#9ca3af"
                      />
                    </PopPressable>
                    <Switch
                      value={enabled}
                      disabled={!canToggle}
                      onValueChange={(value) => setProviderEnabled(def.id, value)}
                    />
                  </View>
                  {expanded ? (
                    <View className="gap-2 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
                      <Text variant="caption" tone="muted">
                        {def.description}
                      </Text>
                      <Text variant="caption" tone="muted">
                        Mode: {executionModeLabels[def.executionMode]}
                      </Text>
                      {def.backendRequired ? (
                        <Text variant="caption" tone="muted">
                          Backend:{' '}
                          {def.backendKey
                            ? backendConfigured
                              ? 'Configured'
                              : 'Not configured'
                            : 'Talos gateway'}
                        </Text>
                      ) : null}
                      {serverEnabled[def.id] === false ? (
                        <Text variant="caption" tone="muted">
                          Disabled on the server. This switch saves your preference; it cannot
                          enable a server-disabled adapter.
                        </Text>
                      ) : null}
                      {def.statusNote ? (
                        <Text variant="caption" tone="muted">
                          {def.statusNote}
                        </Text>
                      ) : null}
                      {def.capabilities.length ? (
                        <Text variant="caption" tone="muted">
                          Capabilities: {def.capabilities.join(', ')}
                        </Text>
                      ) : null}
                      {preferred ? (
                        <Text variant="caption" className="text-primary-500">
                          Primary source for {def.mediaTypes[0]}
                        </Text>
                      ) : null}
                      {health?.lastSuccessAt || health?.lastFailureAt ? (
                        <Text variant="caption" tone="muted">
                          {health.lastSuccessAt
                            ? `Last success: ${formatHealthTimestamp(health.lastSuccessAt)}`
                            : null}
                          {health.lastSuccessAt && health.lastFailureAt ? ' · ' : null}
                          {health.lastFailureAt
                            ? `Last failure: ${formatHealthTimestamp(health.lastFailureAt)}`
                            : null}
                          {health.lastResponseMs ? ` (${health.lastResponseMs}ms)` : null}
                        </Text>
                      ) : null}
                      {health?.lastError ? (
                        <Text variant="caption" className="text-red-400">
                          {health.lastError}
                        </Text>
                      ) : null}
                      {enabled && canToggle ? (
                        <Button
                          label={preferred ? 'Primary' : 'Set primary'}
                          variant={preferred ? 'secondary' : 'ghost'}
                          size="sm"
                          disabled={preferred}
                          onPress={() => setPreferredProvider(def.mediaTypes[0], def.id)}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null,
      )}
    </View>
  );
}
