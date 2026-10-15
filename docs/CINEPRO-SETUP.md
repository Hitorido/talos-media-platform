# Optional CinePro Movies/TV playback

Talos exposes `GET /api/playback/:mediaType/:tmdbId` for `movie` or `tv`. TV requires `?season=1&episode=1`; season 0 is supported for specials.

## Private service setup

1. Follow the [CinePro quickstart](https://docs.cinepro.cc/quickstart). Pin a tested container image digest from `ghcr.io/cinepro-org/core`. Review its noncommercial license. No container was deployed by this change.
2. Run the service privately, reachable from the Talos backend. Configure CinePro `HOST=0.0.0.0`, `PORT=3000` and its own `TMDB_API_KEY`. This differs from Talos's catalog `TMDB_READ_ACCESS_TOKEN`.
3. Set Talos backend `CINEPRO_EXTRACTOR_URL` to the private HTTP(S) origin. Optional `CINEPRO_AUTHORIZATION` supports an authenticated ingress you configure; it does not enable authentication on CinePro itself. Neither variable belongs in Expo public configuration.
4. Deploy the Talos backend and update/rebuild the app. Open Movies/TV in the sidebar, select a title and, for TV, enter season and episode. Verify actual video/audio, seek/resume, quality switching and captions on your device.

## Contract and limitations

The adapter uses the documented OMSS paths `/v1/movies/{id}` and `/v1/tv/{id}/seasons/{season}/episodes/{episode}`, not the proposed `/api/v1/resolve` placeholder. See the [upstream API](https://docs.cinepro.cc/core/api-reference/content/get-streaming-sources-for-a-movie).

OMSS JSON proxy envelopes are decoded to public HTTPS media URLs and permitted request headers. Video travels directly to the device; private service credentials and cookies are not forwarded. Sources requiring the private proxy, IP-bound tokens or unsupported envelopes may not work. Browser CORS/header restrictions can prevent web playback even when Android works. No arbitrary URL proxy was added.

HLS and progressive MP4/HTTP sources are accepted. DASH/MKV and ASS/SSA are omitted. External VTT/SRT captions render in windowed mode; native fullscreen captions require embedded tracks. Source/quality selection, retry and title-based alternate search are available. Global Search currently searches existing anime/comic/novel providers, not a new movie provider index.

HTTP failures remain failures: 403 is UPSTREAM_BLOCKED, DNS failures are 503 DNS_FAILURE, timeouts are 504 TIMEOUT. Empty supported source lists return 404. Resolution is bounded to 20 seconds and 2 MB. No successful playback cache stores error results.

## Progress

Resume is device-local in `movie-tv-progress` and honors incognito. Existing SQLite/MySQL schemas already contain WatchProgress, so no duplicate model or migration was added. Future cloud sync can reuse the existing watching endpoint with mediaId `tmdb:movie:155` / episodeId `movie`, or mediaId `tmdb:tv:1399` / episodeId `s1e1`. Existing time fields use seconds. Cloud sync for this player is not implemented.

## Verification

Focused tests cover OMSS normalization, header filtering, invalid parameters and actual Express HTTP failure responses. No live CinePro instance or playable title has been verified. Private deployment and physical playback remain required before describing this as a working production source.
