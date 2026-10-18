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


## Playback delivery update - 2026-10-15

Public HTTPS CinePro instances without configured ingress authorization now retain their OMSS proxy URLs, allowing CinePro to apply headers and rewrite nested playlists. Private/authenticated instances retain the earlier direct URL delivery restrictions. The player tries each returned source once on a native source error and preserves position. This cannot make a refused upstream source accessible.

Live Hope (TMDB 1058424) check: CinePro and Talos resolve three VidApi streams. Master and variant playlists return 200; sampled first segments return a Cloudflare 403 through CinePro. One normal extraction refresh returned the same provider and reported failures for other providers. Hope remains unavailable; no working playback claim is made.

## Optional browser player - 2026-10-15

Movies/TV now offer a selectable Videasy browser player alongside native CinePro playback. Web uses a sandboxed iframe; Android/iOS use Expo-compatible react-native-webview. Only validated TMDB IDs and season/episode numbers construct the fixed provider URL. Switching modes unmounts the other player. No extraction script or access-control bypass is used.

The embedded provider supplies its own controls, captions and quality options. Talos downloads and progress synchronization are not integrated in this mode. Mobile browser sessions are incognito; web iframe storage is controlled by the browser. Popups and top-level navigation are restricted. A page loading does not establish successful media playback; provider blocking or embedding restrictions can still prevent it.

Research: Streambert uses TMDB v3 metadata and separate Videasy/VidSrc/Vidking web players (https://github.com/truelockmc/streambert/blob/main/src/utils/api.js), with Electron-specific request observation. Videasy movie/TV pages returned HTML 200; VidSrc returned 403 and Vidking DNS failed from the test machine. No successful full playback is claimed. Official Expo 57 WebView documentation: https://docs.expo.dev/versions/v57.0.0/sdk/webview/ .

Web UI: details use metadata on the left and episodes/chapters on the right at widths >=1024px; smaller screens remain stacked. Navigation colors now follow NativeWind instead of a hardcoded light scheme. Web buttons fit their labels unless explicitly fullWidth.

Installed APKs need a rebuild for the new WebView native dependency; Expo Go includes WebView. Deploy a refreshed web export for browser changes. Backend redeployment is not required for this browser mode.

### Additional browser choices

Videasy, VidSrc and SuperEmbed are selectable browser players using documented URL formats. Ordinary requests for movie 155 and TV 1399 S1E1 returned HTML 200 on 2026-10-15; this is not decoded video/phone playback proof. SuperEmbed documents https://multiembed.mov/?video_id=155&tmdb=1 and TV s/e parameters, not the proposed JSON endpoint. VidSrc documents https://vidsrc.sh/embed/movie/155 and /embed/tv/1399/1/1. Videasy retains https://player.videasy.to/movie/155?overlay=true (or /tv/1399/1/1).

References: https://superembed.stream/ and https://vidsrc.sh/ . SuperEmbed may redirect or display host advertisements; restricted navigation can prevent a player from opening. No arbitrary navigation was enabled to work around this. The proposed https://github.com/movie-web/providers returned 404; no unverified key patch was applied to CinePro or its compiled container files. Browser choices do not resolve CinePro segment 403s.

### Player lifecycle fix

Movie-player cleanup now persists the latest event snapshot without accessing the native shared object, which Expo may already have released when switching to browser mode. An actual-component regression simulates release before cleanup and verifies progress persistence and listener removal. WebView navigation is intercepted for all schemes so unsupported links cannot automatically open an external browser; approved HTTPS player navigation remains inside Talos.

Native windowed controls now follow the anime layout: Settings at the top right, play/pause and ten-second skips centered, seekbar and timestamp below, fullscreen on the right. Source/quality and subtitle selectors are under Settings. Native fullscreen uses the platform player; third-party embeds retain their own controls. This is not full control parity (movie bookmarks and episode navigation are not added here). CinePro's previously observed segment 403s are upstream failures and are not fixed by the lifecycle/UI changes.

### October 16 UI and source checks

User reports VidSrc browser playback works on their device; it is now the initial browser-provider selection. Player content is centered and bounded, Back is a visible top-left button, and provider/mode/episode selectors sit below the player. Highlights use up to ten unique real titles (fewer when the feed supplies fewer), tap-to-open, centered sliding dots and right-next/left-previous wrapping swipes. Saved chapter pages also wrap in both directions.

Suggested EmbedSu and player.autoembed.cc movie/TV checks failed DNS resolution; VidSrc.cc v2 movie/TV requests returned 403. None was registered as a working source. The attachment's missing-path URL templates were not used. Existing in-app browser providers remain available.
