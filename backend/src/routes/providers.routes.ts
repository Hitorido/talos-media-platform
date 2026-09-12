import { Router } from 'express';

import {
  disableProvider,
  enableProvider,
  getProviderHealth,
  getProviderStatus,
  listProviderSummaries,
} from '../providers/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const providersRouter = Router();

providersRouter.get('/health', (_req, res) => {
  const providers = listProviderSummaries();
  const enabled = providers.filter((provider) => provider.enabled).length;
  const working = providers.filter((provider) =>
    ['working', 'available', 'limited', 'demo'].includes(provider.status),
  ).length;

  res.json({
    success: true,
    data: {
      status: 'ok',
      adapters: providers.length,
      enabled,
      usable: working,
      note: 'Unified backend content gateway registry. Registered does not mean working.',
      providers: providers.map((provider) => ({
        id: provider.id,
        status: provider.status,
        enabled: provider.enabled,
        health: provider.health,
      })),
    },
  });
});

providersRouter.get('/', (_req, res) => {
  const providers = listProviderSummaries();
  res.json({
    success: true,
    data: {
      adapters: providers,
      providers,
    },
  });
});

providersRouter.get(
  '/:providerId',
  asyncHandler(async (req, res) => {
    const providers = listProviderSummaries();
    const provider = providers.find((entry) => entry.id === req.params.providerId);
    if (!provider) {
      res.status(404).json({ success: false, error: 'Provider not found.' });
      return;
    }
    res.json({
      success: true,
      data: {
        provider,
        status: getProviderStatus(provider.id),
        health: getProviderHealth(provider.id),
      },
    });
  }),
);

providersRouter.post(
  '/:providerId/enable',
  asyncHandler(async (req, res) => {
    try {
      enableProvider(req.params.providerId);
      res.json({
        success: true,
        data: {
          providerId: req.params.providerId,
          enabled: true,
          status: getProviderStatus(req.params.providerId),
        },
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unable to enable provider.',
      });
    }
  }),
);

providersRouter.post(
  '/:providerId/disable',
  asyncHandler(async (req, res) => {
    try {
      disableProvider(req.params.providerId);
      res.json({
        success: true,
        data: {
          providerId: req.params.providerId,
          enabled: false,
          status: getProviderStatus(req.params.providerId),
        },
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unable to disable provider.',
      });
    }
  }),
);
