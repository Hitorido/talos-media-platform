# Talos Phase 6.1 Cloud Readiness

## 1. Current Architecture

Talos currently has two separately runnable parts:

```text
Expo / React Native client
        |
        | EXPO_PUBLIC_API_URL or platform-local default
        v
Express + TypeScript backend
        |
        +-- JWT auth, profiles, library, favorites, history, progress
        +-- Content Gateway
        |     +-- Provider Registry
        |     +-- MangaDex and other adapters
        |     +-- Narou adapter
        |     +-- Configured Consumet / novel proxy adapters
        +-- Prisma Client
              |
              +-- SQLite local database
```

The backend is stateless at the application layer except for database-backed user data. Provider requests are outbound HTTP requests with configurable upstream URLs and timeouts. The local backend now binds to `HOST` and `PORT`, has liveness and database-readiness endpoints, and handles SIGTERM/SIGINT shutdown.

## 2. Recommended Cloud Architecture

```text
Talos Android / iOS / Web
          |
          | HTTPS, EXPO_PUBLIC_API_URL
          v
Render or equivalent backend web service
          |
          +-- Express API / content gateway
          |     +-- direct MangaDex API calls
          |     +-- Narou API/page calls
          |     +-- configured external novel backend
          |     +-- configured self-hosted Consumet
          |
          v
Aiven MySQL or equivalent managed MySQL service
```

Provider-specific upstreams should remain external/configured unless a later phase determines that a provider needs its own worker or service. The backend should not become an unrestricted URL proxy.

## 3. Backend Deployment Requirements

- Runtime: Node.js 22.13+ is the consistent baseline with the current Expo SDK 57 documentation; verify the selected hosting image before deployment.
- Install: `npm ci` from `backend`.
- Build: `npm run build` from `backend`.
- Start: `npm start` from `backend` (`node dist/server.js`).
- Bind: `HOST=0.0.0.0` and platform-provided `PORT`.
- Liveness: `GET /health`.
- Readiness: `GET /health/ready`; performs a database `SELECT 1` and returns 503 when the database is unreachable.
- Provider diagnostics: `GET /api/providers/health`; this is not a substitute for liveness and should not expose secrets.
- Prisma client generation: `npm run prisma:generate` during install/build if the hosting workflow does not run it automatically.
- Production migration command, only after the MySQL schema is prepared: `npx prisma migrate deploy`.

The current production startup validation requires a non-development `JWT_SECRET` and explicit CORS origins when `NODE_ENV=production`.

## 4. Database Migration Plan

Local development remains:

```text
Prisma -> SQLite -> backend/prisma/dev.db
```

Future beta/production should be:

```text
Prisma -> MySQL-compatible managed database
```

Required later work:

1. Create a migration branch or isolated migration change.
2. Change the Prisma datasource provider from `sqlite` to `mysql` and update the migration lock/history appropriately.
3. Validate all schema types, defaults, unique constraints, indexes, cascade behavior, and generated client behavior against MySQL.
4. Provision a separate managed database and obtain its TLS-enabled `DATABASE_URL`.
5. Back up any local data that must be retained; do not treat the local SQLite file as a production backup.
6. Apply the MySQL schema with `prisma migrate deploy`.
7. Import intentionally selected data using a tested migration/export process.
8. Run auth, library, favorites, history, progress, provider, and readiness checks.

The existing migration SQL is SQLite-specific (`TEXT`, `DATETIME`, SQLite table syntax), so it should not be assumed portable as-is. Do not edit the current SQLite migration in place. MySQL migration work belongs after this planning step.

For Aiven MySQL, use the provider's TLS connection requirements and certificate/SSL parameters in the final Prisma URL as documented by Aiven at deployment time. Keep development and production databases separate. Configure connection limits/pooling for the hosting plan and database size, and enable managed backups/retention before beta use.

## 5. Environment Variables

| Variable | Local | Production | Secret? | Purpose |
| --- | --- | --- | --- | --- |
| `HOST` | `0.0.0.0` | `0.0.0.0` | No | Backend bind address |
| `PORT` | `5000` | Platform-provided | No | HTTP listen port |
| `NODE_ENV` | `development` | `production` | No | Runtime mode and error/config validation |
| `DATABASE_URL` | SQLite `file:./dev.db` | MySQL TLS URL | Yes | Prisma database connection |
| `JWT_SECRET` | Development-only local value | Strong generated secret | Yes | JWT signing and verification |
| `JWT_EXPIRES_IN` | `7d` | Explicit policy value | No | JWT lifetime |
| `CORS_ORIGIN` | Local Expo web origin(s) | Exact HTTPS app origin(s), comma-separated | No | Trusted browser origins |
| `NOVEL_GATEWAY_URL` | Optional | Optional configured compatible service | Usually no, but protect any embedded credentials | External novel gateway |
| `CONSUMET_BASE_URL` | Optional self-hosted URL | Optional authorized self-hosted URL | Usually no, protect URL credentials if present | Consumet-compatible anime upstream |
| `SCRAPER_BACKEND_URL` | Optional | Optional trusted backend | Depends on URL | Future controlled scraper backend |
| `PROVIDER_REQUEST_TIMEOUT_MS` | `15000` | Explicit bounded value | No | Outbound provider timeout |
| `ASURA_BASE_URL` | Default public URL, adapter disabled | Only if later enabled and authorized | No | Asura adapter upstream |
| `ASURA_TIMEOUT` | `10000` | Bounded value | No | Asura request timeout |
| `ASURA_RATE_LIMIT_MS` | `1000` | Respectful bounded value | No | Asura request spacing |
| `EXPO_PUBLIC_API_URL` | Optional local override | HTTPS cloud backend URL | No | Frontend backend base URL |

Do not commit `.env` files, database files, JWT secrets, API keys, or credentials. The existing `.gitignore` excludes `backend/.env`, local Prisma databases, and backend build output.

## 6. Frontend Configuration

The Expo client uses `EXPO_PUBLIC_API_URL` first. Without it, `lib/apiConfig.ts` derives a local address from Expo host information, then uses Android emulator `10.0.2.2` or web/iOS simulator `localhost`.

Local examples:

```text
Web / iOS simulator: http://localhost:5000
Android emulator:    http://10.0.2.2:5000
Physical device:     http://<LAN-IP>:5000
```

Future beta builds should receive an HTTPS value at build/profile configuration time:

```text
EXPO_PUBLIC_API_URL=https://<cloud-backend-host>
```

No production API URL was changed during Phase 6.1.

## 7. Provider Configuration

- MangaDex: direct external API from the existing frontend provider; no backend secret; depends on normal API availability and rate behavior.
- Narou: backend adapter using the official metadata API and public chapter pages; no API key; backend outbound network access required.
- `proxy-novel`: configured external novel service through `NOVEL_GATEWAY_URL`; requires a compatible, authorized service; not verified by default.
- `proxy-consumet`: configured self-hosted Consumet-compatible service; `CONSUMET_BASE_URL` required; public Consumet remains unavailable with HTTP 451.
- Asura Scans adapter: backend scraper adapter with environment settings, currently limited/disabled because its assumed search route returned 404.
- Generic scraper slot: planned/disabled; it is not an arbitrary URL proxy.
- Metadata-only anime providers: direct public APIs, but they do not provide real playback and must not be treated as streaming providers.

The direct MangaDex/Narou paths are cloud-compatible as stateless outbound HTTP integrations. Providers needing a self-hosted upstream may require separate infrastructure, but no such infrastructure was created.

## 8. Security Review

Current protections:

- Helmet middleware.
- Zod body validation for auth inputs.
- bcrypt password hashing.
- JWT verification for protected routes.
- Production error message redaction for 5xx responses.
- Bounded provider request timeouts.
- Provider/source ID validation in the content gateway.
- No arbitrary upstream URL accepted by content routes.
- Explicit production validation for JWT secret and CORS configuration.
- CORS now defaults to the local Expo web origin and allows non-browser/mobile requests without an `Origin` header.

Remaining production requirements:

- Generate and store a strong `JWT_SECRET` in the hosting secret manager.
- Set exact HTTPS `CORS_ORIGIN` values; do not use `*` in production.
- Use TLS database connections and verify certificate settings.
- Add platform/API rate limiting before public exposure.
- Review authentication brute-force protection, account recovery, and operational logging before public beta.
- Ensure upstream provider URLs are trusted/configured values and never user-controlled arbitrary fetch targets.
- Add alerting and log retention that excludes tokens, passwords, and provider credentials.

## 9. Persistent Storage Review

The backend does not currently write uploaded media, provider pages, or downloads to its own filesystem. The local SQLite database is the only identified backend persistent file. Mobile offline downloads use client-side storage and are not cloud backend storage.

A cloud service's local disk should therefore be treated as ephemeral. Future server-side caching, exports, uploaded assets, or media storage would require object storage or a managed cache/database. No object storage was added.

## 10. Deployment Plan

1. Freeze and review the current local backend/provider behavior.
2. Prepare a dedicated Prisma MySQL migration and validate it against a disposable MySQL database.
3. Provision a separate managed MySQL database with TLS and backups.
4. Configure production environment variables and secret storage.
5. Run `npm ci`, Prisma client generation, and `npm run build` in `backend`.
6. Run `npx prisma migrate deploy` against the production database after migration review.
7. Deploy the backend web service with `HOST=0.0.0.0` and the platform `PORT`.
8. Verify `/health`, `/health/ready`, authentication, and provider health.
9. Verify content gateway flows for MangaDex and Narou, then separately test configured upstreams.
10. Set `EXPO_PUBLIC_API_URL` to the HTTPS backend for a beta Expo build.
11. Run mobile/web beta smoke tests and monitor errors, database health, and upstream provider failures.

No step above was executed in Phase 6.1.

## 11. Files Changed During Phase 6.1

- `backend/src/config/env.ts`: added `HOST`, safer local CORS default, and production secret/CORS validation.
- `backend/src/app.ts`: added origin filtering and `/health/ready` database readiness endpoint.
- `backend/src/server.ts`: added configurable host binding and graceful SIGTERM/SIGINT shutdown.
- `backend/.env.example`: documented `HOST` and trusted local CORS configuration.
- `PHASE-6.1-CLOUD-READINESS.md`: this plan.

No Prisma schema, migration, database, provider, frontend API URL, cloud service, or production credential was changed.

## 12. Tests

- Backend `npm run build`: PASS.
- Local `/health`: PASS, returned `ok`.
- Local `/health/ready`: PASS, returned `ready` with SQLite reachable.
- Local `/api/providers/health`: PASS, returned the registered provider health summary.
- `node scripts/phase4-gateway-smoke.mjs`: PASS.
- `node scripts/phase3-novel-smoke.mjs`: PASS.
- Existing MangaDex classification/regression and Phase 5 beta smoke were already passing before this planning change and were not architecturally changed here.
- Frontend `npm run typecheck`: BLOCKED by the existing missing `cursor/canvas` module declarations in `canvases/comic-source-matrix.canvas.tsx`.
- Deployment: NOT RUN, intentionally.
- Prisma SQLite-to-MySQL migration: NOT RUN, intentionally.

## 13. Known Issues

- The project-wide frontend typecheck still has the pre-existing `cursor/canvas` declaration issue.
- The existing Prisma migration history is SQLite-specific and requires a deliberate MySQL migration plan; it is not production MySQL-ready merely because `DATABASE_URL` is configurable.
- The current backend has no application rate limiter, metrics, or external log/alert integration.
- Provider health is operational metadata, not a full dependency probe for every upstream.
- `proxy-consumet` and `proxy-novel` remain configuration-dependent.
- The backend currently logs a host/port URL for operational convenience; production platforms should use their service URL in deployment documentation and health probes.

## 14. Phase 6.2 Recommendation

Phase 6.2 should be a controlled database migration and disposable-environment validation step: select the managed MySQL service, create and test a MySQL-compatible Prisma migration against a non-production database, validate TLS and connection limits, and run the full auth/library/progress/provider regression suite. Deployment should follow only after that migration is reviewed and local SQLite development remains intact.

**PHASE 6.1 COMPLETE — CLOUD DEPLOYMENT PLAN READY — WAITING FOR YOUR CONFIRMATION.**
