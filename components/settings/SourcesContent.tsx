import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Button, Input, Text } from '@/components/ui';
import { initializeProviders, providerRegistry } from '@/providers';
import {
  useBackendConfigStore,
  type BackendUrlKey,
} from '@/stores/backendConfigStore';
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
    hint: 'Compatible novel API base (search/details/chapters/content). Leave empty to use this app Express /api/novels gateway.',
  },
  {
    key: 'consumet',
    label: 'Consumet Base URL',
    hint: 'Self-hosted Consumet API. Public api.consumet.org returns HTTP 451.',
  },
  {
    key: 'scraper',
    label: 'Scraper Backend URL',
    hint: 'Optional future comic scraper backend.',
  },
];

function statusColor(status: ProviderStatus): string {
  switch (status) {
    case 'working':
      return 'text-emerald-500';
    case 'limited':
      return 'text-amber-500';
    case 'requires-configuration':
    case 'requires-backend':
      return 'text-blue-400';
    case 'candidate':
      return 'text-neutral-400';
    default:
      return 'text-neutral-400';
  }
}

function formatHealthTimestamp(timestamp?: number): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleString();
}

export function SourcesContent() {
  initializeProviders();
  const providers = providerRegistry.list();
  const enabledMap = useProviderStore((state) => state.enabled);
  const setProviderEnabled = useProviderStore((state) => state.setProviderEnabled);
  const getProviderStatus = useProviderStore((state) => state.getProviderStatus);
  const backendUrls = useBackendConfigStore((state) => state.backendUrls);
  const setBackendUrl = useBackendConfigStore((state) => state.setBackendUrl);
  const isBackendConfigured = useBackendConfigStore((state) => state.isBackendConfigured);
  const healthByProvider = useProviderHealthStore((state) => state.healthByProvider);
  const [draftUrls, setDraftUrls] = useState<Partial<Record<BackendUrlKey, string>>>({});

  const grouped = {
    anime: providers.filter((provider) => provider.definition.mediaTypes.includes('anime')),
    manga: providers.filter((provider) =>
      provider.definition.mediaTypes.some((type) => ['manga', 'manhwa', 'manhua'].includes(type)),
    ),
    novel: providers.filter((provider) => provider.definition.mediaTypes.includes('novel')),
  };

  return (
    <View className="gap-6">
      <View className="gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text variant="label">Backend Endpoints</Text>
        <Text variant="caption" tone="muted">
          Configure optional self-hosted backends. Novel Backend Gateway uses the Novel URL when set;
          otherwise it calls this app&apos;s Express /api/novels proxy (requires NOVEL_GATEWAY_URL).
        </Text>
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
        items.length > 0 ? (
          <View key={label} className="gap-3">
            <Text variant="caption" tone="muted" className="font-semibold uppercase tracking-wide">
              {label}
            </Text>
            {items.map((provider) => {
              const def = provider.definition;
              const status = getProviderStatus(def.id);
              const enabled = enabledMap[def.id] === true;
              const canToggle = def.capabilities.length > 0;
              const health = healthByProvider[def.id];
              const backendConfigured = def.backendKey
                ? isBackendConfigured(def.backendKey)
                : false;

              return (
                <View
                  key={def.id}
                  className="gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <Text variant="label">{def.name}</Text>
                      <Text variant="caption" tone="muted">
                        {def.description}
                      </Text>
                      <Text variant="caption" className={statusColor(status)}>
                        Status: {statusLabels[status]}
                      </Text>
                      <Text variant="caption" tone="muted">
                        Mode: {executionModeLabels[def.executionMode]}
                      </Text>
                      {def.backendRequired ? (
                        <Text variant="caption" tone="muted">
                          Backend: {backendConfigured ? 'Configured' : 'Not configured'}
                        </Text>
                      ) : null}
                      {def.statusNote ? (
                        <Text variant="caption" tone="muted">
                          {def.statusNote}
                        </Text>
                      ) : null}
                      {def.capabilities.length > 0 ? (
                        <Text variant="caption" tone="muted">
                          Capabilities: {def.capabilities.join(', ')}
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
                    </View>
                    <Switch
                      value={enabled}
                      disabled={!canToggle}
                      onValueChange={(value) => setProviderEnabled(def.id, value)}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null,
      )}
    </View>
  );
}
