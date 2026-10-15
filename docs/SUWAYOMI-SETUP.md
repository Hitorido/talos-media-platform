# Optional Suwayomi comic bridge

Talos supports a private Suwayomi service through its GraphQL API. It does not run Android extension APKs inside Node.js. This bridge covers comics; it does not add anime or novel playback.

## Manual setup

1. Install a pinned release of [Suwayomi Server](https://github.com/Suwayomi/Suwayomi-Server) or follow its [official container setup](https://github.com/Suwayomi/Suwayomi-Server-docker). Use persistent storage. Keep the service private, reachable from the Talos backend; do not expose an unauthenticated instance publicly.
2. In Suwayomi's WebUI, add the [Keiyoushi extension repository](https://keiyoushi.github.io/docs/guides/getting-started), install the sources you want, and verify search, chapter lists and images there. Extensions are installed explicitly; Talos does not install or execute arbitrary remote JavaScript.
3. Obtain installed source IDs from Suwayomi's GraphQL API (`/api/graphql`) or WebUI network responses. Keep IDs as strings: they can exceed JavaScript's safe integer range.
4. In the **Talos backend** environment, set `SUWAYOMI_URL` to the private origin (for example `http://suwayomi:4567`) and `SUWAYOMI_SOURCE_IDS` to up to three comma-separated IDs. If authentication is enabled, set `SUWAYOMI_AUTHORIZATION` to the complete authorization header supported by your installed version. Do not put this credential in an Expo public variable.
5. Restart/deploy the backend and enable **Suwayomi** in Talos Sources. Test a search, details, a selected chapter, images and an offline download. Until this passes on your service, the integration remains configuration-required, not production-verified.

Talos uses `fetchSourceManga`, `fetchMangaAndChapters` and `fetchChapterPages`, not the nonexistent example `/api/v1/source/pages`. Manga ownership is checked against your configured source list. Image delivery only accepts numeric thumbnail/chapter-page paths; private service credentials stay on the backend. The API contract was checked against the upstream Kotlin definitions on 2026-10-14. Version differences may require adjusting the bridge; pin and test upgrades.

A Render deployment still needs network access to the private service and sufficient persistent resources. This setup does not guarantee that upstream sites accept your host's requests. Refusals and rate limits remain errors.

## Movies and TV catalog (optional)

Set backend `TMDB_READ_ACCESS_TOKEN` to a TMDB API Read Access Token, then restart/deploy. Movies/TV metadata uses this token. Optional playback now requires a separate private CinePro service; see [CinePro setup](CINEPRO-SETUP.md). Missing configuration shows an error for the respective feature. API credentials are never embedded in the app.

## Verification boundary

AO3 public work search/details/chapters/text initially passed locally for The Villainess Malfoy (36 chapters). A later full recheck timed out after primary-host HTTP 525 failures; the official secure.ao3.org host independently returned search results. Production availability remains unverified. Native direct fallback uses existing parsers for WeebCentral, DemonicScans, Kaliscan, MangaJinx, Royal Road and The Wandering Inn; ordinary device access still needs phone testing. Browser requests retain the gateway because source CORS permission cannot be assumed. Neither a device request nor Suwayomi fixes DNS failures or guarantees access through a site's protection.
