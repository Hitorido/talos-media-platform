# Talos development notes

## Stack

- Expo SDK 57 / React Native / TypeScript / Expo Router
- Backend: Express + Prisma under `backend/`
- Production API: `https://talos-media-platform.onrender.com`

## Local run

```bash
npm install
cd backend && npm install && npm run dev
# other terminal
npx expo start
```

Optional: set `EXPO_PUBLIC_API_URL` in `.env.local` for a custom backend. Release builds default to Render.

## Sources / providers

Active providers are registered in `providers/index.ts`. Scraper Backend sources call the Render content gateway with fixed adapters. Consumet is not an active beta provider.

Provider capability notes: [PHASE-6.5-PROVIDER-MATRIX.md](../PHASE-6.5-PROVIDER-MATRIX.md)

## Update checker

Clients fetch `GET /api/version` on the Talos backend. The manifest `downloadUrl` must remain an official GitHub Releases URL.

## Builds

```bash
# Android beta APK (requires Expo/EAS login)
eas build -p android --profile preview

# Web export + EAS Hosting
npx expo export --platform web
eas deploy --prod
```

## Tests

```bash
npm run typecheck
node scripts/phase6.5-reader-zoom-test.mjs
node scripts/phase6.5-stabilization-test.mjs
```

## Cold starts

Render free tier may sleep. Probe `/health` with up to ~90s before treating the backend as down.
