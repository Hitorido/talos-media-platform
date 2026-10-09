# Changelog

All notable user-facing changes to Talos are documented here.

## [0.6.6-beta] - 2026-10-08

A beta update focused on reliable reading, richer playback controls, offline access and a cleaner Android/Web experience.

## What's New

- Incognito mode and a protected Private collection with device authentication.
- Android background download support, offline title details and covers, and downloaded subtitle tracks.
- Cover-colored detail backgrounds and Start/Continue actions.

## Improvements

- Chapter-image prefetching, reader list performance and saved-position restoration across reading modes.
- Subtitle language selection and player settings visibility.
- Stable download ordering, compact queue controls and expandable downloaded titles with resume and details actions.
- Restricted Express media proxy, validated bundled provider manifests and backend wake requests on launch/resume.
- Responsive web layouts and themed application dialogs.

## Fixes

- Manga seekbar taps, image fitting, chapter transitions and reader layout anchoring.
- Novel navigation layering beneath reader controls.
- Nested web buttons, download toolbar overflow and whole-player scale animation.
- Cover decoding compatibility with Android's JavaScript runtime.

## Known Limitations

- This is a beta; physical Android verification remains ongoing.
- Third-party provider availability, downloadable content and subtitle coverage may change. Chinese/Korean anime coverage remains incomplete.
- Background downloads require the rebuilt Android app and remain subject to operating-system restrictions.
- Source daily limits and locked chapters are respected. Render cold starts can delay initial requests.

## Downloads

- Android APK: **To be added manually**.
- [Web beta](https://talos-media-platform--go1st4khak.expo.app) (hosted version may differ from this draft).
- Source code archives are generated automatically by GitHub from the release tag.

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
