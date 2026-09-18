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

## NovelCodex.org batch

Added the public-only backend adapter, backend/frontend registration and scripts/phase6.5-novelcodex-smoke.mjs. Backend build and actual search/details/list/text smoke passed, including blocked access above the anonymous free-chapter boundary. No account, database or production configuration changes.

## Kaliscan / MangaJinx batch

Added backend/src/providers/kaliscan/adapter.ts, source registrations and scripts/phase6.5-kaliscan-smoke.mjs. Backend build and both real image-flow checks passed. Frontend typecheck still reports only the four pre-existing cursor/canvas TS2307 errors. Dead chapter images are documented rather than hidden behind a Working status. These sources remain opt-in.

## Search and reader regression checkpoint

Global search now runs at most three actual provider operations concurrently, skips disabled/unsupported sources, preserves successful results after another source fails, and records health. Removed the demo-only special error query. Comic alternate-source suggestions require equal normalized titles, preventing sequels from silently qualifying; translated aliases still require future metadata matching. Existing direct clients do not all have request/body timeouts yet, so bounded concurrency is not claimed to solve every stalled source.

Validation: phase6.5-search-test passes against the actual service; phase6.5-reader-gateway-smoke passes for Kaliscan, MangaJinx and NovelCodex.org including locked HTTP 403. Phase 3 novel, Phase 4 gateway, MangaDex classification, and Phase 5.6 beta smokes pass. Narou real text remains available. Public Consumet still returns HTTP 451. Frontend typecheck retains only the four known cursor/canvas errors. Physical rendering is unverified.
