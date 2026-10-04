# Talos

<p align="center">
  <img src="assets/images/talos-logo.svg" alt="Talos" width="96" />
</p>

<p align="center">
  <strong>Talos</strong> is a unified media application for discovering, reading, watching, organizing, and downloading supported manga, novels, and anime across multiple provider integrations.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-Beta-orange.svg" alt="Beta" />
  <img src="https://img.shields.io/badge/version-0.6.5--beta-blue.svg" alt="Version" />
  <img src="https://img.shields.io/badge/Expo-57-000020.svg?logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/platform-Android%20%7C%20Web-brightgreen.svg" alt="Platform" />
</p>

## Preview

![Talos Preview](docs/media/talos-preview.gif)

Full demo video is available in the [latest GitHub Release](https://github.com/Hitorido/talos-media-platform/releases/latest).

## Screenshots

<p align="center">
  <img src="docs/images/home.jpg" alt="Home" width="180" />
  <img src="docs/images/search.jpg" alt="Search" width="180" />
  <img src="docs/images/details.jpg" alt="Details" width="180" />
  <img src="docs/images/manga-reader.jpg" alt="Manga reader" width="180" />
</p>
<p align="center">
  <img src="docs/images/webtoon-reader.jpg" alt="Webtoon reader" width="180" />
  <img src="docs/images/novel-reader.jpg" alt="Novel reader" width="180" />
  <img src="docs/images/anime-player.jpg" alt="Anime player" width="180" />
  <img src="docs/images/downloads.jpg" alt="Downloads" width="180" />
</p>
<p align="center">
  <img src="docs/images/sources.jpg" alt="Sources" width="180" />
  <img src="docs/images/settings.jpg" alt="Settings" width="180" />
</p>

## Features

- **Unified search & discovery** across manga, novels, and anime providers
- **Manga / manhwa / manhua reader** with pinch zoom, double-tap zoom, fling, RTL/LTR, and bookmarks
- **Novel reader** with continuous and chapter modes, styling controls, and bookmarks
- **Anime playback** with subtitles, bookmarks, offline downloads where supported
- **Library, history, and progress** persistence
- **Downloads / offline** queue for supported media types
- **Rolling chapter downloads** with configurable 5, 10, 15, or 20 chapter windows
- **Custom title covers** from the photo library or a selected manga page
- **Multi-provider architecture** with source switching and failure isolation
- **In-app update checker** against the official GitHub Releases channel

## Technology

**Frontend:** Expo 57, React Native, TypeScript, Expo Router, NativeWind, Zustand, Reanimated, Gesture Handler, expo-video

**Backend:** Node.js, Express, TypeScript, Prisma, MySQL (production), SQLite (local development)

**Infrastructure:** Render, Aiven MySQL, EAS Hosting / EAS Build, GitHub Releases

<p align="center">
  <img src="https://img.shields.io/badge/Expo-57-000020?logo=expo&logoColor=white" alt="Expo 57" />
  <img src="https://img.shields.io/badge/React_Native-0.86-20232A?logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/NativeWind-4-38BDF8?logo=tailwindcss&logoColor=white" alt="NativeWind" />
  <img src="https://img.shields.io/badge/Zustand-5-443E38" alt="Zustand" />
  <img src="https://img.shields.io/badge/Reanimated-4-7B61FF" alt="React Native Reanimated" />
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-API-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/MySQL-Production-4479A1?logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/SQLite-Local-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Render-Hosting-46E3B7?logo=render&logoColor=black" alt="Render" />
</p>

```mermaid
flowchart LR
  subgraph App["Talos app · Expo 57"]
    UI["React Native + TypeScript"] --> Router["Expo Router"]
    Router --> Styling["NativeWind"]
    Router --> State["Zustand"]
    Router --> Motion["Reanimated + Gesture Handler"]
    Router --> Playback["expo-video"]
  end
  App -->|"direct APIs"| Providers["MangaDex · AniList · Kitsu · Jikan · Narou"]
  App -->|"normalized content API"| API["Express + TypeScript"]
  API --> Adapters["Source-specific adapters"]
  API --> ORM["Prisma"]
  ORM --> MySQL["MySQL · production"]
  ORM --> SQLite["SQLite · local development"]
  API --> Hosting["Render"]
```

## Architecture

```
Talos (Android / Web)
  ├─ Direct APIs (MangaDex, AniList, Kitsu, Jikan, …)
  └─ Talos Render Backend
       └─ Fixed source-specific adapters
            └─ Normalized Talos media models
```

Talos does not expose a generic arbitrary-URL scraper. Scraper Backend providers use dedicated adapters on the Render service.

## Installation (developers)

```bash
git clone https://github.com/Hitorido/talos-media-platform.git
cd talos-media-platform
npm install
cd backend && npm install && cd ..
```

Public client env (optional for local development):

```bash
# .env.local — never commit secrets
EXPO_PUBLIC_API_URL=http://localhost:5000
```

Production / beta builds default to `https://talos-media-platform.onrender.com`.

```bash
# Terminal A — backend
cd backend && npm run dev

# Terminal B — Expo
npx expo start
```

## Beta download

Install the Android APK from [GitHub Releases](https://github.com/Hitorido/talos-media-platform/releases).

Updates are optional. Talos can notify you in-app when a newer beta is published; Download opens the official release page only.

## Web version

Talos is available on the web through EAS Hosting:

https://talos-media-platform--go1st4khak.expo.app

## Update manifest

Clients check:

`GET https://talos-media-platform.onrender.com/api/version`

Hosted on the Talos backend. The `downloadUrl` must point at the official GitHub Releases page.

## Provider disclaimer

Providers are third-party sites and APIs. Availability can change without notice. Talos does not control upstream uptime, CAPTCHA, geo blocks, or anti-bot measures. Some sources may appear limited or unavailable in beta.

## Roadmap

- Stabilize scraper backends behind Render
- Expand reliable discovery feeds
- Improve offline packaging for anime media
- Optional account sync polish

## Development status

**Beta** — suitable for early testers. Not a stable 1.0 release.

## License

See repository license terms and third-party attributions where applicable.
