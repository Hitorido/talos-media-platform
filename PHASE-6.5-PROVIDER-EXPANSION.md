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

## Approved production continuation

User explicitly approved stable provider deployments in the continuation attachment. Pushed 6ded54a to main; Render now serves the new registry and all four requested health endpoints pass. MangaPill and NovelCodex full gateway content flows pass. WeebCentral/Kaliscan/MangaJinx/NovelArrow return upstream 403 from Render despite local success; status notes now disclose that limitation. Earlier statements saying deployment approval is pending are historical and superseded.

Added GdScans adapter, source registration and focused smoke. MangaPill fixed-host relay now sets Cross-Origin-Resource-Policy: cross-origin for public images only; global CORS unchanged. Source HTTP helper supports the source-owned read-only chapter-list POST with method-separated cache keys. No database schema or account changes.

## Second production result and DemonicScans checkpoint

GdScans is now Render-verified through actual cover/page images. Added independently implemented DemonicScans adapter and focused smoke; canonical chapter URL fixed the ordinary redirect failure. Local actual frontend/gateway contract passes. No account or schema changes. Tests retain only the known four frontend canvas errors.

## Real home discovery batch

Replaced home mock discovery arrays with seven real sections: Recommendations; Recently Updated Manga/Novels/Anime; Trending Manga/Novels/Anime. Reused existing cards and local continue-reading/watching state. Source identity is displayed and route IDs remain provider-scoped. Five feed operations are bounded to three concurrent requests, with 20-second request/body timeouts, in-flight deduplication, two-minute cache, source enable filtering, refresh and isolated unavailable states.

Files: services/discoveryService.ts, backend/src/providers/narou/discovery.ts, the content route, home screen, missing-cover handling in ContentPosterCard, and scripts/phase6.5-discovery-smoke.mjs. Each live section returned 12 real items; cache/deduplication/disabled sources/Narou detail navigation/invalid-feed rejection passed. Injected AniList outage preserved other feeds. Existing Phase 3/4 regressions pass. Frontend typecheck has only the four known canvas errors. Production web export passed with 19 static routes. No claim of physical rendering is made.

Narou discovery route requires the next approved production deployment; frontend is committed app code, not a separately hosted Expo Web site. Global production CORS and database schemas are unchanged. Earlier report statements that home still uses mocks are superseded by this batch.

## Latest deployment verification limitation

Discovery commit 37538cd was pushed successfully. Its local tests and production web export passed. The first production discovery test failed only on the Render-backed Narou feeds with fetch failed; direct MangaDex/AniList feeds continued returning real items. Follow-up /health connections failed before HTTP with UND_ERR_CONNECT_TIMEOUT against the normally resolved Render addresses, while api.github.com returned 200. This is a reachability observation, not evidence of a code-level deployment failure or confirmed source blocking. GitHub commit status exposes no Render status entries. Browser dashboard inspection also failed because its Windows sandbox kernel could not start. The user has been asked for the current Render deployment status/log error. Do not claim this latest discovery route production-verified until a successful recheck. Earlier full Render checks at 6613808 remain valid historical evidence.

## Physical Android checklist

Use the project's compatible Expo runtime and the configured Render API URL; enable the desired opt-in provider in Sources. No emulator is required.

- MangaPill: search One Piece, choose MangaPill, open Chapter 1. Expect all 57 pages to load, scrolling and next-chapter navigation to work, and source identity to remain visible.
- GdScans: search sage, select The Strongest Sage with 0 Magic Power, open Ch.1.1. Expect 21 pages and correct next-chapter navigation.
- NovelCodex.org: search gluttony, select The Second Coming of Gluttony, open Chapter 1 / Prologue. Expect readable paragraphs and next-chapter navigation; subscription-only chapters must not be offered as freely readable.
- AnimeParadise: search Naruto using AnimeParadise, open Episode 1. Expect real video and audio, seek/pause/resume, and progression persistence through the existing local player. External subtitle integration remains unavailable.
- Home discovery: enable MangaDex, AniList and Narou. Verify seven sections, visible source names, correct detail navigation and Refresh. Narou production feed verification is currently pending connectivity recovery; unavailability must show honestly.
- Disabled sources: disable a source and verify its discovery cards disappear; re-enable and refresh. Recommendations are currently AniList related-title suggestions, not personalized predictions.

## Current requested report

1. Added this continuation: GdScans and DemonicScans adapters, real home discovery service and Narou discovery route.
2. Upgraded: GdScans from research-only to full Render content verification; MangaPill/NovelCodex from local-only to full Render verification.
3. Limited: all new providers still await physical reader/player validation; Kaliscan/MangaJinx have known dead chapters; DemonicScans supports simple slugs only.
4. Blocked/unavailable: WeebCentral/Kaliscan/MangaJinx/NovelArrow/DemonicScans return upstream 403 from Render. NovelUpdates and FreeWebNovel search challenge failures remain recorded. MangaGg/MangaOwl full flows remain unfinished after timeout observations; no claim of global discontinuation.
5. Novel text: Narou regression passes; NovelCodex public text verified through Render; NovelArrow works locally but its Render path fails.
6. Anime playback: AnimeParadise actual HLS/segments/H.264/AAC verified, native expo-video rendering pending. Metadata APIs are not counted as playback.
7. Discovery: all seven requested sections implemented with real data; live local tests pass. Recommendations currently anime-only.
8. Search: three-provider concurrency and failure isolation preserved and tested.
9. Switching: conservative normalized comic title matching retained; alternate-language aliases/year-aware matching remain incomplete.
10. Render providers: MangaPill, GdScans, NovelCodex complete flows passed; five sources returned upstream 403.
11. Deployment: earlier batches deployed and verified; discovery batch pushed, latest reachability/route confirmation pending as described above.
12. Phone: checklist above; no native success fabricated.
13. Reader: MangaDex classification/beta and new normalized image-flow tests passed.
14. Novel reader: Phase 3, Narou beta and NovelCodex gateway tests passed; discovery navigation passed locally.
15. Player: real AnimeParadise media/ffprobe regression passed; physical rendering still required.
16. Typecheck/build: backend build passes; frontend has only four known canvas errors; web export passes with 19 routes.
17. Limits: production source 403s, latest Render connectivity, physical UI verification, anime-only recommendations, no HTML-source discovery redundancy, some legacy direct-client timeout coverage and remaining source flows.
18. Next: confirm latest Render deployment and feeds; physical checklist; MangaTown adapter plus restricted Referer image delivery; finish MangaGg/MangaOwl investigation; safe direct-client feasibility for cloud-blocked sources. Do not start Phase 6.6.

Discovery references: official Narou API order documentation at https://dev.syosetu.com/man/api/; live public AniList GraphQL and MangaDex API contracts; exact Expo SDK 57 docs read before coding.

## MangaTown continuation checkpoint

Render priority check: /health, /health/ready, /api/providers/health and /api/content/providers all failed before HTTP with UND_ERR_CONNECT_TIMEOUT. No provider code was changed to address this transport problem.

Implemented MangaTown adapter and restricted image route using existing normalized reader models. Verified one real title/chapter through the actual frontend bridge, all 29 sequential page descriptors and sampled cover/first/middle/last images. Rejected arbitrary URL/traversal/unknown parameters, out-of-range and unlisted pages. Focused search, Phase 3 novel and Phase 4 gateway regressions pass; backend build passes; frontend typecheck remains only the four known canvas errors.

MangaGg now fails with normal-access 403 challenge, MangaOwl search remains a bounded timeout. Direct feasibility checks cannot establish native support without a phone: all five locally working/cloud-blocked sources return 200 locally but no browser CORS permission for the tested origin. No device is connected. Physical test request sent to the user; no result reported yet.

Files: backend/src/providers/mangatown/adapter.ts and image.ts, backend/frontend registry entries, content route, existing frontend bridge URL normalization, scripts/phase6.5-mangatown-smoke.mjs and reports. No DB/account changes.

Additional phone case when MangaTown is production-verified (or via the local LAN gateway): Koi wa Amaagari no You ni, Chapter 1, expect 29 actual pages with source identity and chapter navigation.

## Requested continuation report - current checkpoint

1. Render connectivity/deployment: 526928d pushed; all four post-push health requests at 2026-09-18T09:24:35Z fail before HTTP with UND_ERR_CONNECT_TIMEOUT. Runtime deployment not confirmed.
2. Discovery production: latest Narou route/seven-section production confirmation remains pending connectivity; local real feeds and isolated failure tests already pass.
3. MangaTown: local full flow PASS; 29 actual pages, cover and sampled first/middle/last images through restricted relay. Production pending.
4. MangaGg: ordinary current search HTTP 403 with challenge indicators. No bypass.
5. MangaOwl: search TimeoutError after 20 seconds. Not declared dead.
6. Direct/native: five sources respond 200 locally but no browser CORS permission. No connected phone; native Direct remains unverified/unimplemented.
7. New Render-verified sources this checkpoint: none due transport failure. Previously verified MangaPill/GdScans/NovelCodex retained as historical verified results.
8. Local-only: MangaTown pending production; WeebCentral/Kaliscan/MangaJinx/NovelArrow/DemonicScans have prior Render upstream 403 evidence.
9. Physical MangaPill: user result pending.
10. Physical GdScans: user result pending.
11. Physical NovelCodex: user result pending; locked chapters remain rejected by existing access enforcement.
12. Physical AnimeParadise: user result pending; previous real HLS/video/audio/ffprobe evidence is not native rendering proof.
13. Physical discovery: pending production connectivity and user phone result. Recommendations remain anime-only.
14. Search/source switching: focused service regression PASS; three-operation cap and conservative matching unchanged.
15. Reader regression: actual MangaTown frontend bridge/image flow PASS, including page order and invalid input rejection. No reader UI changes.
16. Novel reader: Phase 3 and gateway regressions PASS. No novel parsing changes in this checkpoint.
17. Player: no player code changes; prior media regression retained, physical validation pending.
18. Build/typecheck: backend build PASS; only four known frontend cursor/canvas TS2307 errors. Previous 19-route export retained; no unrelated rerun needed.
19. Known limitations: transport outage, missing phone results, cloud-blocked sources, no native Direct claim, MangaTown supported CDN/path formats and 300-page cap, MangaGg challenge/MangaOwl timeout.
20. Ready to close: no. Required production discovery/health and physical anime playback have not been verified. Phase 6.6 not started.
