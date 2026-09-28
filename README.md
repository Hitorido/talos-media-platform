# 🌌 Talos Media Platform

<p align="center">
  <img src="assets/images/icon.png" alt="Talos Logo" width="120" height="120" style="border-radius: 24px;" />
</p>

<p align="center">
  <strong>A unified, provider-agnostic client for discovering, reading, watching, and tracking Anime, Manga, Manhwa, Manhua, and Web Novels.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-v57.0-000020.svg?style=flat-square&logo=expo" alt="Expo SDK 57" />
  <img src="https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg?style=flat-square&logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-5.3+-3178C6.svg?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/NativeWind-v4-06B6D4.svg?style=flat-square&logo=tailwindcss" alt="NativeWind" />
  <img src="https://img.shields.io/badge/Node.js-Express%20%2B%20Prisma-339933.svg?style=flat-square&logo=nodedotjs" alt="Backend" />
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Web-brightgreen.svg?style=flat-square" alt="Platform" />
</p>

---

## 📖 Overview

**Talos** eliminates the friction of switching between multiple fragmented apps for reading and watching Japanese, Korean, Chinese, and global media. Built with a clean **provider-based decoupling pattern**, the core reading and viewing experience remains rock-solid while content sources can be dynamically plugged in, extended, or configured.

Whether you are binge-reading manga chapters, tracking ongoing light novels, streaming anime episodes, or caching content for offline commutes, Talos delivers a fast, fluid, and unified interface.

---

## ✨ Key Features

### 📺 Anime Streaming & Discovery
- **Discovery & Catalog:** Search, filter, and view metadata powered by AniList, Kitsu, and Jikan (MyAnimeList).
- **Streaming Players:** Built with `expo-video` supporting multi-resolution HLS / MP4 playback, episode selection, and position resume.
- **Provider Switching:** Decoupled streaming resolvers (including DonghuaStream and optional Consumet proxies) with graceful error handling and fallbacks.

### 📖 Manga, Manhwa & Manhua Reader
- **High-Performance Reader:** Continuous vertical webtoon strip and horizontal paged reader modes powered by `react-native-reanimated` and gesture handlers.
- **Multi-Source Catalog:** Native integrations for MangaDex, WeebCentral, MangaPill, MangaTown, and scraper adapters.
- **Reading Progress Tracking:** Instant auto-save of current chapter and scroll percentages locally and via cloud synchronization.

### 📚 Web & Light Novel Reader
- **Distraction-Free Text Engine:** Clean reader interface with customizable font sizes, line heights, themes (AMOLED dark, sepia, light), and reading margins.
- **Rich Source Support:** Integration with Narou (Shousetsuka ni Narou), Royal Road, NovelCodex, NovelPing, NovelArrow, and external novel microservices.
- **Offline Text Caching:** Fast chapter-by-chapter local storage for instant offline reading.

### 📥 Download & Offline Manager
- **Centralized Queue:** Background download engine with pause, resume, cancel, and auto-retry capabilities.
- **Storage Management:** Monitor downloaded storage usage, browse downloaded media without an internet connection, and purge cached chapters cleanly.

### 🔄 Cloud Sync & Personal Library
- **Cross-Device Sync:** Optional sync with the Talos Express backend for favorites, reading history, and playback progress.
- **Unified Library:** Organize content into custom statuses (*Reading*, *Plan to Read*, *Completed*, *On Hold*, *Dropped*).
- **Local-First Fallback:** Seamless offline functionality backed by Zustand and encrypted secure storage (`expo-secure-store`).

---

## 🏛️ System Architecture

Talos enforces a strict separation of concerns between UI presentation, domain entities, and data providers:

```
┌────────────────────────────────────────────────────────┐
│                   Talos Client (Expo)                  │
│       Pages (Expo Router) ── Components ── Stores      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Unified Media Domain Layer               │
│      Media Hooks (useAnimeContent, useMangaContent)    │
│      Normalized Models (UnifiedMedia, Chapter, Ep)     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Provider Registry                    │
│  Validates capabilities, status checks, active toggles  │
└───────┬───────────────────┬────────────────────┬───────┘
        │                   │                    │
        ▼                   ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌────────────────┐
│ Direct Client │   │ Direct Client │   │ Talos Backend  │
│  (MangaDex,   │   │ (AniList API, │   │ Content Gateway│
│   Narou, etc) │   │  Kitsu, etc)  │   │  (Express/TS)  │
└───────────────┘   └───────────────┘   └───────┬────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │ External Aggregators  │
                                    │ & Scraper Microservices│
                                    └───────────────────────┘
```

---

## 🔌 Provider Matrix

| Provider | Type | Media Supported | Implementation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **MangaDex** | Manga / Manhwa | Manga, Manhwa, Manhua | Direct API | 🟢 Working |
| **WeebCentral** | Manga / Manhwa | Manga, Manhwa, Manhua | Backend Gateway | 🟢 Working |
| **MangaPill** | Manga | Manga | Backend Gateway | 🟢 Working |
| **MangaTown** | Manga | Manga | Backend Gateway | 🟢 Working |
| **GdScans / DemonicScans**| Manga | Manga | Backend Gateway | 🟡 Limited / Host dependent |
| **AniList** | Anime Catalog | Anime Metadata | Direct GraphQL | 🟢 Working |
| **Kitsu** | Anime Catalog | Anime Metadata | Direct REST | 🟢 Working |
| **Jikan (MAL)** | Anime Catalog | Anime Metadata | Direct REST | 🟢 Working |
| **DonghuaStream** | Anime Streaming| Donghua / Anime | Backend Gateway | 🟢 Working |
| **Royal Road** | Web Novel | Web Novels | Backend Gateway | 🟢 Working |
| **NovelCodex** | Web Novel | Light / Web Novels | Backend Gateway | 🟢 Working |
| **NovelPing** | Web Novel | Web Novels | Backend Gateway | 🟢 Working |
| **Narou** | Light Novel | Japanese Web Novels | Direct Web Scraper | 🟢 Working |
| **Consumet Proxies** | Multi-Media | Anime / Manga | Self-Hosted Gateway | ⚪ Configurable URL required |

---

## 🛠️ Tech Stack

### Frontend Application
- **Framework:** [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) with React Native 0.86
- **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-system based navigation)
- **Styling:** [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS for React Native)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Video Engine:** [expo-video](https://docs.expo.dev/versions/latest/sdk/video/)
- **Animations & Gestures:** [Reanimated 4](https://docs.swmansion.com/react-native-reanimated/) & [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- **Storage:** Expo FileSystem, Expo SecureStore

### Backend Service
- **Runtime:** Node.js (v20+ / v22 LTS) & TypeScript
- **Server:** Express.js, Helmet, CORS
- **ORM & Database:** Prisma ORM with SQLite (Development) / MySQL (Cloud-ready: Aiven / PlanetScale)
- **Authentication:** Stateless JWT & Bcrypt password hashing
- **Parsing & Scraping:** Cheerio

---

## 📂 Project Structure

```text
talos/
├── app/                       # Expo Router application screens
│   ├── (tabs)/                # Main bottom tab routes (Home, Library, History, Settings)
│   ├── anime/                 # Anime details & video player screens
│   ├── manga/                 # Manga chapter details & interactive image reader
│   ├── novel/                 # Novel reader interface & typography controls
│   └── _layout.tsx            # Root navigation stack & theme providers
├── backend/                   # Standalone Express + Prisma gateway
│   ├── prisma/                # Database schema & migrations (SQLite & MySQL)
│   ├── src/
│   │   ├── controllers/       # Auth, Library, Progress, Content controllers
│   │   ├── middleware/        # JWT verification, CORS, error handling
│   │   ├── providers/         # Gateway scraper & aggregator adapters
│   │   ├── routes/            # REST API route declarations
│   │   └── server.ts          # Server initialization & graceful shutdown
│   └── package.json
├── components/                # Reusable UI components (Modals, Cards, Players, Controls)
├── hooks/                     # Custom React hooks (useAnimeContent, useMangaContent, etc.)
├── providers/                 # Client-side media provider registry and implementations
├── stores/                    # Zustand stores (authStore, libraryStore, downloadStore)
├── types/                     # Shared TypeScript interface definitions
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20.x or v22.x recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/go) app on your mobile device OR Android Studio / Xcode

---

### 1. Repository Setup

```bash
git clone https://github.com/Hitorido/talos-media-platform.git
cd talos-media-platform
```

### 2. Frontend Configuration & Launch

1. Install project dependencies:
   ```bash
   npm install
   ```

2. Configure environment (optional, defaults to local detection):
   ```bash
   # Copy sample client environment
   cp .env.example .env
   ```
   *For physical devices, set `EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5000`.*

3. Start the Expo development server:
   ```bash
   npm run start
   ```

4. Press:
   - `a` to open in Android Emulator
   - `i` to open in iOS Simulator
   - `w` to open in Web Browser
   - Or scan the terminal QR code with **Expo Go**

---

### 3. Backend Setup (Optional for cloud sync & gateway scrapers)

1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```

2. Initialize backend environment variables:
   ```bash
   cp .env.example .env
   ```

3. Run database migrations & generate Prisma client:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will run at `http://localhost:5000`. You can verify health via:
   ```bash
   curl http://localhost:5000/health
   ```

---

## 🧪 Available Scripts

### Frontend
- `npm run start` — Launch Expo dev server.
- `npm run android` — Launch on connected Android device/emulator.
- `npm run ios` — Launch on iOS simulator.
- `npm run web` — Run web preview.
- `npm run lint` — Lint files using Expo ESLint rules.
- `npm run typecheck` — Perform strict TypeScript validation (`tsc --noEmit`).
- `npm run format` — Auto-format codebase with Prettier.

### Backend
- `npm run dev` — Run server with live reloading via `tsx watch`.
- `npm run build` — Compile TypeScript to `dist/`.
- `npm run start` — Run production server.
- `npm run prisma:migrate` — Apply database schema updates.

---

## ⚖️ Disclaimer & Content Notice

Talos is an open-source media player and content client developed strictly for educational and personal portfolio purposes. 

- **No Media Hosting:** Talos does not host, upload, or store any video, audio, comic, or novel files on its servers.
- **Provider Aggregation:** All content is retrieved dynamically from third-party APIs and publicly accessible external sources.
- **Copyright Compliance:** Users are responsible for complying with copyright laws, licensing, and terms of service of the content providers they access.

---

## 📄 License

Distributed under the [MIT License](LICENSE). See `LICENSE` for more information.

---

<p align="center">
  Crafted with care by <strong>Talos Contributors</strong>
</p>
