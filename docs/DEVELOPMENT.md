# Talos development notes

## Stack

- Expo SDK 57 / React Native / TypeScript / Expo Router
- Backend: Express + Prisma under `backend/`
- Production API: `https://talos-media-platform.onrender.com`

## Local run

```bash
npm install
cd backend && npm install && npm run dev
# other terminal
npx expo start
```

Optional: set `EXPO_PUBLIC_API_URL` in `.env.local` for a custom backend. Release builds default to Render.

## Sources / providers

Active providers are registered in `providers/index.ts`. Scraper Backend sources call the Render content gateway with fixed adapters. Consumet is not an active beta provider.

Provider capability notes: [PHASE-6.5-PROVIDER-MATRIX.md](../PHASE-6.5-PROVIDER-MATRIX.md)

## Update checker

Clients fetch `GET /api/version` on the Talos backend. The manifest `downloadUrl` must remain an official GitHub Releases URL.

## Builds

```bash
# Android beta APK (requires Expo/EAS login)
eas build -p android --profile preview

# Web export + EAS Hosting
npx expo export --platform web
eas deploy --prod
```

## Tests

```bash
npm run typecheck
node scripts/phase6.5-reader-zoom-test.mjs
node scripts/phase6.5-stabilization-test.mjs
```

## Cold starts

Render free tier may sleep. Probe `/health` with up to ~90s before treating the backend as down.

### Fixed-source media proxy

- Images: `GET /api/content/proxy/manhuaplus/image?path=<encoded CDN path>`; `mangapill` is also supported. Existing `/api/content/mangapill/image` URLs remain compatible.
- MP4: `GET /api/content/proxy/animexin/video/:mediaId/:episodeId`, using IDs from the source catalog. Supports HEAD and one HTTP byte range.
- No raw URL parameter, arbitrary request headers, credentials, redirect following or generic host forwarding. Limits: eight active transfers per process, 30-second idle deadline, 10 MB/image and 1 GB/video transfer. Horizontal replicas have independent concurrency limits.
- The MP4 endpoint is available to clients; existing direct playback stays the default. It does not rewrite HLS playlists. Add another source only with its own fixed-origin/path validation and content-flow tests.

Checks: `node scripts/phase6.5-media-proxy-test.mjs` and `node scripts/phase6.5-privacy-test.mjs` after the backend build. Private collection locking uses the OS credential prompt; it does not encrypt app-data JSON or downloaded media. iOS Face ID needs a development build; Android authentication should be retested on the physical device.


### Reviewed extension manifests

`backend/src/providers/extensions/index.json` selects versioned, bundled video, comic and novel modules. The loader validates schema, IDs, duplicate entries, media kinds and required adapter methods before registration. AnimeXin, ManhuaPlus and NovelPing currently use this path; their existing public-content parsers and normalized gateway remain intact.

This adopts the manifest/module separation used by Miru/Mangayomi. It is **not** a compatible runtime for arbitrary Miru or Mangayomi scripts, does not download executable code at startup, and does not add new verified sources. To update a source, review its module, run its full content-flow smoke, increment its manifest version, and deploy the reviewed bundle. Node `vm` is not used as a security sandbox. Suwayomi is a separate comic server, not an anime/novel endpoint.

### Reader and web checks

- `node scripts/phase6.5-reader-anchor-test.mjs`: actual reader components, RTL insertion, chapter/page preservation, stable renderer/layout identities, bounded image queue and extension manifests.
- Reader images are warmed in batches of three for the active chapter, starting at the visible page. Native image prefetch is distinct from rendering: the list still virtualizes rows to bound memory.
- Tailwind spacing/radius values are converted from numeric native tokens to CSS pixel strings. Web utilities use the `html` specificity prefix; native precedence stays unchanged. Keep typography class names in Tailwind's content scan.
- Browser export: `npx expo export --platform web`. Serve clean routes with `.html` fallback/rewrite on the web host; requesting `/search.html` directly is not the same Expo Router route as `/search`.

### Android background downloads

The APK includes `react-native-background-actions` with `plugins/withDownloadService.js`. The queue starts a `dataSync` foreground service from the visible app; a generic notification is present while work remains. Expo Go does not include the native module and keeps the foreground-only queue. Rebuild with `eas build --platform android --profile preview` after installing dependencies.

Test on the installed APK with notification permission enabled: queue multiple chapters/episodes, press Home, return, dismiss from Recents and reopen, then test offline details and supported captions. Force-stop and OS service/battery limits can interrupt work; persisted unfinished downloads are queued on next launch. The service is not a guarantee of indefinite execution and does not provide unlimited source access.

Primary references: [background-actions installation](https://github.com/Rapsssito/react-native-background-actions/blob/master/INSTALL.md), [Expo 57 background task limitations](https://docs.expo.dev/versions/v57.0.0/sdk/background-task/). The scheduled Expo BackgroundTask API is not used as a continuous media downloader.
