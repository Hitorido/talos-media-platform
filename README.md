# Talos

> A unified media app for discovering, watching, reading, and managing anime, manga, manhwa, manhua, and web novels.

Talos is a cross-platform personal media application built around a **provider-based architecture**. It brings different types of media into one application while keeping content providers independent from the core UI and media experience.

The project is designed to support multiple sources, offline access, progress tracking, personal libraries, and eventually community-driven features.

---

## ✨ Features

### 📺 Anime

- Anime search and discovery
- Anime metadata and details
- Episode listings
- Provider-based playback architecture
- Video playback
- Playback source resolution
- Support for multiple anime providers
- Demo playback for development and testing

### 📖 Manga, Manhwa & Manhua

- Search and discovery
- Manga/manhwa/manhua details
- Chapter listings
- Page-based reader
- Multiple content providers
- Source switching
- Language selection where supported
- Reading progress tracking
- Offline reading architecture

### 📚 Web Novels

- Novel search and discovery
- Novel details
- Chapter listings
- Chapter text content
- Provider-independent novel reader
- Offline chapter support
- Multiple-source architecture

### 📥 Downloads

- Centralized download manager
- Download queue
- Pause and resume
- Retry failed downloads
- Cancel downloads
- Delete downloads
- Completed-download management
- Offline media support

### 📚 Personal Library

- Favorites
- Reading progress
- Watching progress
- History
- Saved media
- Persistent local data

### 🔌 Multi-Source Provider System

Talos separates the application from individual content sources through a provider architecture.

```text
Talos UI
   ↓
Unified Media Layer
   ↓
Provider Registry
   ↓
Media Provider
   ↓
Source / API
```

This allows providers to be added, removed, disabled, or replaced without rebuilding the core media experience.

### 🌐 Backend

Talos also includes an Express + TypeScript backend that provides:

- Authentication
- User profiles
- Library synchronization contracts
- Favorites
- History
- Reading progress
- Watching progress
- Provider management
- Unified content gateway
- Provider health checks

The backend currently uses SQLite for local development and is designed to support a hosted database in the future.

---

## 🛠️ Tech Stack

### Frontend

- **Expo**
- **React Native**
- **TypeScript**
- **Expo Router**
- **NativeWind**
- **Zustand**
- **TanStack Query**
- **React Native Reanimated**
- **React Native Gesture Handler**
- **FlashList**
- **Expo FileSystem**
- **Expo SecureStore**
- **React Hook Form**
- **Zod**
- **expo-video**

### Backend

- **Node.js**
- **Express**
- **TypeScript**
- **Prisma**
- **SQLite**
- **JWT**
- **bcrypt**
- **Zod**
- **Helmet**
- **CORS**

---

## 🏗️ Architecture

Talos is designed around a provider-independent architecture.

### Media Flow

```text
User
 │
 ▼
Talos UI
 │
 ▼
Media Hooks / Services
 │
 ▼
Unified Media Layer
 │
 ▼
Provider Registry
 │
 ├── Manga Provider
 │
 ├── Anime Provider
 │
 └── Novel Provider
 │
 ▼
External Source / API
```

### Backend Content Gateway

```text
Expo App
   │
   ▼
Backend API
   │
   ▼
Content Gateway
   │
   ▼
Provider Registry
   │
   ├── Consumet Adapter
   ├── Novel Adapter
   └── Scraper Adapter
   │
   ▼
Configured Upstream Service
```

The architecture is intentionally designed so that provider-specific logic does not leak into the application's screens.

---

## 📂 Project Structure

```text
talos/
│
├── app/
│   ├── anime/
│   ├── manga/
│   ├── novel/
│   ├── library/
│   ├── history/
│   └── settings/
│
├── components/
│
├── hooks/
│
├── providers/
│   ├── builtin-mock/
│   ├── mangadex/
│   ├── novel-backend/
│   └── catalog/
│
├── services/
│   ├── api/
│   ├── contentService.ts
│   └── ...
│
├── stores/
│
├── types/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── providers/
│   │   ├── routes/
│   │   └── ...
│   ├── prisma/
│   └── package.json
│
├── scripts/
│
├── package.json
└── README.md
```

> The exact structure may change as Talos continues to evolve.

---

## 🚀 Getting Started

### Requirements

Make sure you have installed:

- Node.js
- npm
- Git
- Expo CLI / Expo-compatible environment
- Android Studio for Android development
- Xcode for iOS development on macOS

---

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/talos.git
cd talos
```

---

### 2. Install frontend dependencies

```bash
npm install
```

---

### 3. Start the Expo application

```bash
npx expo start
```

You can then run Talos using:

- Android Emulator
- iOS Simulator
- Physical Android device
- Physical iOS device
- Other supported Expo environments

---

## 🖥️ Backend Setup

Navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

For Windows PowerShell, you can also use:

```powershell
Copy-Item .env.example .env
```

Configure the required environment variables in `.env`.

---

### Database

Talos currently uses SQLite for local backend development.

Run Prisma migrations:

```bash
npx prisma migrate dev
```

Generate the Prisma client:

```bash
npx prisma generate
```

---

### Start the backend

```bash
npm run dev
```

The backend will normally be available at:

```text
http://localhost:5000
```

Health check:

```text
GET /health
```

---

## 🔐 Environment Variables

Do not commit your `.env` files or private credentials.

Example backend configuration:

```env
PORT=5000
NODE_ENV=development

DATABASE_URL="file:./dev.db"

JWT_SECRET="your-development-secret"

CORS_ORIGIN="http://localhost:8081"

NOVEL_GATEWAY_URL=
CONSUMET_BASE_URL=
```

Use `.env.example` as the reference for required configuration.

---

## 🔌 Providers

Talos uses providers to retrieve media from external sources.

A provider can expose capabilities such as:

```text
Search
Details
Chapters
Pages
Episodes
Text Content
Streaming
Downloads
Images
Recommendations
```

Providers can have different capabilities. Talos checks these capabilities before attempting an operation.

### Provider Status

Providers may be marked as:

- `Working`
- `Limited`
- `Requires Configuration`
- `Unavailable`
- `Planned`
- `Disabled`

This prevents unavailable sources from being presented as working sources.

---

## ⚠️ Content Sources

Talos is designed as a **provider-based media client**.

The application itself does not claim ownership of third-party media.

External providers and sources may have their own:

- Terms of service
- Copyright policies
- Geographic restrictions
- Authentication requirements
- Rate limits
- Availability limitations

Only use sources and content that you are legally permitted to access.

Talos does not encourage copyright infringement or unauthorized redistribution of copyrighted material.

---

## 🧪 Development Status

Talos is currently under active development.

### Current Architecture

- [x] Expo / React Native application
- [x] Provider architecture
- [x] Local persistence foundation
- [x] Download manager architecture
- [x] Backend foundation
- [x] Backend content gateway
- [x] Comic provider architecture
- [x] Anime playback provider architecture
- [x] Novel provider architecture
- [x] Authentication API
- [x] Library API
- [x] Progress API
- [x] History API
- [x] Provider health system

### In Progress

- [ ] Additional verified comic sources
- [ ] Additional verified anime playback sources
- [ ] Additional verified novel sources
- [ ] Source management improvements
- [ ] Full beta media testing
- [ ] Cloud backend deployment
- [ ] Production database configuration
- [ ] End-to-end beta testing

### Future

- [ ] Cloud synchronization
- [ ] Community feed
- [ ] User profiles
- [ ] Posts and blogs
- [ ] Reviews and recommendations
- [ ] Messaging
- [ ] Media sharing
- [ ] Custom themes
- [ ] Custom templates
- [ ] Community-created templates
- [ ] Short-form vertical media discovery
- [ ] Movies
- [ ] TV shows

---

## 🗺️ Roadmap

```text
Phase 1
Comic Source Hardening
        │
        ▼
Phase 2
Anime Playback Providers
        │
        ▼
Phase 3
Novel Provider Architecture
        │
        ▼
Phase 4
Unified Backend Content Gateway
        │
        ▼
Phase 5
Source Discovery & Integration
        │
        ▼
Phase 6
Beta Cloud Deployment
        │
        ▼
Phase 7
Beta Build & End-to-End Testing
        │
        ▼
Community & Cloud Features
        │
        ▼
Movies / TV / Future Media
```

The roadmap may change as the project develops.

---

## 🎯 Project Goals

The long-term goal of Talos is to create a **single, flexible media platform** where users can manage different types of entertainment from one application.

Instead of building separate applications for anime, manga, manhwa, manhua, and novels, Talos aims to provide one unified experience while keeping each source independent.

The architecture is designed to make future expansion easier without rebuilding the entire application.

---

## 🤝 Contributing

Talos is currently a personal portfolio project.

Contribution guidelines may be added in the future as the project becomes more mature.

If contributing in the future, please:

1. Keep provider logic separated from UI code.
2. Follow the existing TypeScript architecture.
3. Avoid hardcoding provider-specific behavior into screens.
4. Preserve normalized media models.
5. Add appropriate tests for new functionality.
6. Respect the terms and licenses of external sources.

---

## 📄 License

This project is currently intended as a personal portfolio and development project.

A formal open-source license will be added if and when the project is released for external contributions.

---

## 👨‍💻 Author

**Talos** is developed as a personal software development and portfolio project.

Built with:

**Expo + React Native + TypeScript + Node.js + Prisma**

---

> **Talos** — One place for the stories you watch and read.
