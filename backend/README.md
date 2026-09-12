# Backend — Step 12 Foundation

Node.js + Express + Prisma backend for authentication, profiles, library, favorites, history, progress, and future provider adapters.

## Stack

- Express
- Prisma
- SQLite for local development (MySQL supported via `DATABASE_URL`)
- JWT auth + bcrypt password hashing
- Zod validation

## Setup

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

Health check: `http://localhost:5000/health`

## Expo client

Set `EXPO_PUBLIC_API_URL` when needed:

- Web / iOS simulator: `http://localhost:5000`
- Android emulator: `http://10.0.2.2:5000`
- Physical device: `http://YOUR_LAN_IP:5000`

The app resolves a default URL automatically via `lib/apiConfig.ts`.

## Notes

- Local offline stores remain the source of truth until Step 13 sync.
- **Unified content gateway** (`/api/content/*`) selects registered backend provider adapters.
- Provider registry: `/api/providers` and `/api/providers/health`
- Novel content proxy remains at `/api/novels/*` and now delegates to the unified gateway + `proxy-novel` adapter.
- Set `NOVEL_GATEWAY_URL` to enable novel proxying. Without it, novel routes return Requires Configuration.
- Set `CONSUMET_BASE_URL` only for a self-hosted Consumet instance. Public Consumet remains unavailable (HTTP 451).
- This backend does **not** scrape websites and does **not** accept arbitrary user-supplied fetch URLs (SSRF-safe).
- Database remains **SQLite** for local development.
