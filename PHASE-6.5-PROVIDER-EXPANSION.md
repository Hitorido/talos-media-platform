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

## Current report and outstanding scope (2026-09-18)

1. Architecture: existing provider registry, normalized media contracts, gateway and reader/player retained.
2. Files changed: provider adapters/registries, shared source HTTP and image relay, frontend gateway bridge, playback content type, search service/helper, focused scripts and these reports; see local Phase 6.5 commits. Pre-existing Phase 6.4 changes remain separate.
3. Previous failures: public Consumet, WeebCentral, MangaNelo, MangaKakalot, NovelUpdates, Asura and configured proxy slots retested; details in matrix.
4. Old/current statuses: WeebCentral progressed from challenge indicators to real local images; Consumet remains 451; NovelUpdates remains challenge-blocked; other failures are recorded per request without claiming global discontinuation.
5. Comic research: all ten requested names were investigated; current URLs and normal HTTP results are in the matrix. Additional candidate sources were probed. Several full flows remain unfinished.
6. Comic integrations: WeebCentral, MangaPill, Kaliscan and MangaJinx have local content-flow evidence; MangaDex regression passed.
7. Comic failures: Kaliscan/MangaJinx chapter 0 images 404; MangaGg/MangaNelo/MangaKakalot requests timed out; other concrete DNS/TLS/HTTP failures and unfinished candidates are recorded in matrix.
8. Novel research: Narou, NovelUpdates, both NovelCodex identities, NovelArrow, FreeWebNovel and NovelBin.
9. Novel readers: Narou regression passes; NovelArrow and NovelCodex.org public text adapters pass locally. Render/physical verification of new adapters remains pending.
10. Novel metadata-only: NovelCodex.com is tracking/indexing; NovelUpdates remains blocked. Neither is integrated as a full reader.
11. Anime research: old Consumet Gogoanime/Zoro paths, HiAnime, AnimeKai, AnimePahe and AnimeParadise; original AniWave not revived.
12. Anime metadata: AniList, Jikan and Kitsu HTTP 200 on current retest.
13. Real anime media: AnimeParadise search/details/episodes/HLS/segment and ffprobe H.264/AAC passed; physical expo-video playback remains unverified.
14. Strategy: MangaDex and anime metadata/public AnimeParadise APIs Direct; HTML comic/novel adapters Backend; legacy proxy endpoints Configuration Required.
15. Render: existing registry HTTP 200, proxy-novel search 503 configuration required, disabled proxy-consumet/proxy-scraper searches 403. New adapters not yet deployed or production-verified.
16. Aggregation: three concurrent operations, enabled/media filtering, health/error isolation verified. Some older direct clients still need body/request timeout coverage.
17. Source switching: existing UI retained, comic alternatives now require normalized title equality; translated alias/year matching remains future work. No silent cross-title switch added.
18. Recommendations: home still uses existing mock data; provider-driven replacement remains required.
19. Recently Updated: not yet provider-driven.
20. Trending Manga: not yet provider-driven.
21. Trending Novels: not yet provider-driven.
22. Trending Anime: not yet provider-driven.
23. Comic regression: MangaDex classification and real images pass; new frontend/gateway model/image tests pass. Physical device reader not run.
24. Novel regression: Phase 3 and Narou beta text pass; NovelCodex gateway text and locked HTTP 403 pass.
25. Player regression: typecheck has only four pre-existing canvas errors; actual native expo-video execution remains outstanding.
26. Provider matrix: PHASE-6.5-PROVIDER-MATRIX.md contains source evidence and limitations.
27. References: current source HTML/client request contracts, official Expo 57 docs, Cheerio docs, Consumet status project, anime-sdk public documentation, Keiyoushi MGJinx domain issue. No parser implementation copied.
28. Security/access: fixed origins, bounded requests, no arbitrary URL relay, locked content rejected, no bypass mechanisms or database changes.
29. Known limits: new backend sources local-only; phone rendering, discovery, additional requested full flows, title aliases and uniform request timeout coverage remain incomplete.
30. Next work: complete GdScans/DemonicScans/MangaTown/MangaOwl flows; add real discovery feeds; finish timeout coverage; deploy approved checkpoints and repeat through Render; verify readers/player on the physical phone.
