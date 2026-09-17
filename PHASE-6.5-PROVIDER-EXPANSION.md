# Phase 6.5 — Provider Expansion

Phase 6.5 is in progress. Account/community/synchronization work is deferred. Existing Phase 6.4 changes remain uncommitted and are not included in provider checkpoints.

## Architecture retained

Frontend provider registry → normalized models → existing reader/player; backend content gateway for server parsing; direct public APIs remain direct. Existing health tracking and source switching are preserved. Home discovery currently uses mock arrays and is scheduled for provider-driven replacement in this phase.

## First provider batch

WeebCentral has an independently implemented backend adapter and frontend bridge. Two-title real content smoke passed. It is not yet claimed production-ready or physically rendered. See `PHASE-6.5-PROVIDER-MATRIX.md`.

Files: backend package manifests (Cheerio), shared source HTTP helper, WeebCentral adapter, backend registry, frontend gateway bridge and registry, source probe and WeebCentral smoke, these reports.

## Physical Android verification

Use a physical phone with the project's compatible Expo runtime. Set EXPO_PUBLIC_API_URL to the local machine LAN URL (or Render once adapter deployment is verified), enable the source in Sources, search the verified title, open details, choose a chapter, verify page images and chapter navigation. No emulator is required. Do not infer physical rendering from HTTP/image checks.

## Previous phase completion evidence

The already-running Phase 6.4 authenticated production smoke completed successfully during handoff: registration, login, authenticated me, profile, library/favorites/history, reading/watch progress all persisted across reauthentication. History/library were deleted, profile bio cleared, favorite removal verified; empty collections verified after a fresh login. Residual dedicated account `talos64_ffdf87faf6e8`, its profile, and reading/watch progress for `phase64-ffdf87faf6e8` remain because no delete APIs exist. Password/token were not printed. No further account work is part of Phase 6.5.

## Anime playback batch

Added `providers/animeparadise/index.ts`, registered it opt-in, added optional normalized playback `contentType`, and passed that type to the existing expo-video player. `scripts/phase6.5-animeparadise-smoke.mjs` runs the actual adapter with `phase6.5-test-loader.mjs` and optionally verifies H.264/AAC using ffprobe. The normal public API produced real Naruto playback, not demo footage. Native Android rendering and subtitle support are still limitations. Typecheck retains only the known cursor/canvas errors.

Production push of the WeebCentral checkpoint was rejected by automatic approval review because deployment permission was not explicit enough. A specific approval request is pending; no workaround push was attempted. Local provider work continues.

## MangaPill batch

Added the manga-only adapter, source-specific bounded image relay, frontend URL mapping, gateway route, and two focused smoke scripts. Real source metadata and chapter images verified for two titles; frontend normalization and restricted relay verified through the local gateway. Render deployment remains pending approval. No change to general reader/download implementations was needed.

## NovelArrow batch

Added `backend/src/providers/novelarrow/adapter.ts`, a generic frontend novel-gateway bridge, registry entries, and `scripts/phase6.5-novelarrow-smoke.mjs`. Source's actual public chapter contract is parsed independently. Explicit locked-content flags stop reading rather than triggering an access workaround.
