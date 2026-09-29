# Development guide and history

Talos is in Phase 6.5 beta. A successful HTTP or decoder test does not establish physical Android rendering, subtitle synchronization, or smooth playback.

## Start here

- [Current work and verification](../PHASE-6.5-PROVIDER-EXPANSION.md): read the latest dated section first; older checkpoints describe historical behavior.
- [Provider evidence and limitations](../PHASE-6.5-PROVIDER-MATRIX.md)
- [Backend setup](../backend/README.md)

## Code map

- `providers/`: frontend source registry and normalized provider bridges.
- `backend/src/providers/`: fixed-origin source adapters; HTML parsing belongs here.
- `services/contentService.ts`: source selection, search, and reader/player resolution.
- `services/discoveryService.ts`: cached source-driven discovery feeds.
- `components/manga/useReaderZoom.ts`: focal pinch, double tap, panning, and shared webtoon scale.
- `components/content/SelectionModal.tsx`: explicit selection and 100-entry catalog ranges.
- `services/downloadService.ts`: bounded download queue; content resolves when a download starts.
- `services/hlsDownload.ts`: supported public VOD segments and English subtitle files saved locally.
- `stores/`: device-local preferences, bookmarks, progress, and library state.
- `scripts/phase6.5-*.mjs`: focused regression and live source checks. Live tests depend on current upstream availability.

Use brief function comments to explain contracts, constraints, and non-obvious decisions. Prefer descriptive names over comments that repeat each line. Do not log credentials, full signed playback URLs, chapter text, or user search strings.

## Backend during Expo Go development

Expo's Metro server and the content backend are separate processes. Running Expo alone does not start the backend. Sources shows the resolved API URL. Without an explicit `EXPO_PUBLIC_API_URL`, the app derives the development computer's LAN host and port 5000.

The phone and computer must be on a reachable network, and the backend must remain running. A localhost-only address refers to the phone itself. An installed APK intended to work away from the development computer needs a deployed, reachable HTTPS backend configured when building the app.

## Historical milestones

Reports remain at their existing paths to preserve links and development evidence:

- [Phase 5.2](../PHASE-5.2-REPORT.md), [5.3](../PHASE-5.3-REPORT.md), [5.4](../PHASE-5.4-REPORT.md), [5.5](../PHASE-5.5-REPORT.md), [5.6](../PHASE-5.6-REPORT.md)
- [Cloud readiness](../PHASE-6.1-CLOUD-READINESS.md)
- [Database migration](../PHASE-6.2-DATABASE-MIGRATION.md)
- [Render deployment](../PHASE-6.3-RENDER-DEPLOYMENT.md)
- [Frontend cloud integration](../PHASE-6.4-FRONTEND-CLOUD-INTEGRATION.md)

Historical success is not a current source-health guarantee. Placeholder/unavailable adapters stay in code for saved-route compatibility but are excluded from active source selection and search. Temporary network failures do not prove a provider is permanently gone.


### Render cold starts

If Render appears unavailable, request `https://talos-media-platform.onrender.com/health` with time for a free-tier cold start (up to 90 seconds), then retry the specific content route. Do not switch the app to a LAN URL solely because a short health probe timed out. A health 200 does not prove that every upstream provider works; report source 403/502 errors separately. This is an on-demand check, not a periodic keep-alive service.
