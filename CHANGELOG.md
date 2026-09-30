# Changelog

All notable user-facing changes to Talos are documented here.

## [0.6.5-beta] — 2026-09-30

First public beta release of Talos.

### Added

- Talos branding (app name, icons, adaptive icon, splash)
- In-app update checker with Settings → Check for updates
- Public `/api/version` manifest endpoint on the Talos backend
- EAS Build profiles (`preview` / `production`) targeting installable Android APKs
- Production Render backend URL embedded for release builds

### Improved

- Manga / webtoon reader zoom, pan, and fling behavior
- Novel and anime reader/player control polish from Phase 6.5
- Provider registry defaults for restored scraper-backend sources
- Documentation rewritten for portfolio / open-source presentation

### Fixed

- Zoomed vertical scrolling no longer defers page load until finger lift
- Release builds no longer fall back to developer LAN backends
- Consumet removed from active Sources UI and default enablement

### Known Issues

- Some scraper-backend sources may return upstream HTTP 403 from Render
- Free-tier Render cold starts can delay the first request after idle
- Explicit per-app refresh-rate forcing is not available on Expo SDK 57 (System / Auto only)
- Web production URL may still need the first EAS Hosting deploy
- Physical-device PASS claims require on-device testing beyond automated checks
