# Talos Step 5.4 Report

## A. Novel Source Inventory

Serious candidates evaluated or carried forward:

- Shosetsuka ni Narou (Narou)
- Royal Road
- NovelFire
- NovelBuddy
- BookReadFree
- Novel Updates
- Web Novel Translations
- J-Garden
- KolNovel
- Light Novel Crawler / lncrawl-compatible services
- `novel-api`-compatible services
- Mangayomi novel extensions
- Mihon-related novel extensions
- Open-source novel parser/provider repositories

The existing Step 5.1 candidates were not treated as working without current access and complete chapter-content evidence.

## B. Source Matrix

| Source | Method | Search | Details | Chapters | Chapter text | Reader | Configuration | Security | License / authorization | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Shosetsuka ni Narou | Official metadata API plus normal public HTML pages | PASS | PASS | PASS | PASS | PASS: real Japanese chapter text rendered in the existing Expo reader | No provider key; Talos backend required | No bypass used | Official API/site terms and underlying content rights remain separate | Working |
| Royal Road | Normal website candidate | Tested HTTP 200 homepage | Not verified | Not verified | Not verified | Not verified | Backend adapter would be required | No bypass used | Service terms and content rights require review | Planned / investigation |
| NovelFire | Normal website candidate | Tested HTTP 200 homepage | Not verified | Not verified | Not verified | Not verified | Backend adapter required | No bypass used | Service/content authorization not established | Planned / investigation |
| NovelBuddy | Website candidate | Redirect response observed | Not verified | Not verified | Not verified | Not verified | Backend adapter required | No bypass used | Service/content authorization not established | Limited / investigation |
| BookReadFree | Website candidate | Tested HTTP 200 homepage | Not verified | Not verified | Not verified | Not verified | Backend adapter required | No bypass used | Service/content authorization not established | Limited / investigation |
| Novel Updates | Website candidate | HTTP 403 / Cloudflare challenge | Not verified | Not verified | Not verified | Not verified | None | No Cloudflare bypass attempted | Service/content authorization not established | Unavailable / Blocked |
| Web Novel Translations | Website/community candidate | Not verified | Not verified | Not verified | Not verified | Not verified | Backend adapter required | No bypass used | Service/content authorization not established | Planned |
| J-Garden | Website/community candidate | Not verified | Not verified | Not verified | Not verified | Not verified | Backend adapter required | No bypass used | Service/content authorization not established | Planned |
| KolNovel | Website/community candidate | Not verified | Not verified | Not verified | Not verified | Not verified | Backend adapter required | No bypass used | Service/content authorization not established | Planned |
| Narou API alone | Official JSON metadata API | PASS | PASS | Metadata only | No chapter text endpoint | Not applicable | No | No bypass used | Official API terms apply | Limited: metadata-only API |
| lncrawl / novel-api references | Self-hosted/configured upstream | Not tested live | Contract supported by existing proxy | Contract supported | Contract supported | Not verified with a real endpoint | `NOVEL_GATEWAY_URL` required | Trusted configured upstream only | Code license, service authorization, and content rights are separate | Requires Configuration |
| Mangayomi / Mihon novel extensions | Open-source parser ecosystems | Researched | Varies | Varies | Varies | Not integrated into Talos | Backend/runtime required | Protected sources excluded | Parser code license does not grant content rights | Planned |

## C. Implemented Providers

### `narou`

Added a source-specific adapter through the existing backend provider registry:

- Official Narou API search and metadata details
- Official public novel-page chapter listing
- Official public chapter HTML parsing into normalized paragraphs
- Shared provider timeout and normalized gateway errors
- Japanese language normalization
- No frontend scraping, private keys, arbitrary URL proxying, or local filesystem state

Added the corresponding frontend provider through the existing `MediaProvider` registry. It calls the existing `/api/content` gateway and uses the existing `NormalizedMedia`, `NormalizedChapter`, `NormalizedNovelContent`, `contentService`, and Novel Reader path.

### Existing `proxy-novel`

Preserved unchanged as the configuration-required adapter for compatible lncrawl/novel-api-style upstream services. It still fails clearly when `NOVEL_GATEWAY_URL` is absent and never substitutes demo text.

## D. Verified Providers

### Shosetsuka ni Narou (`narou`)

Narou completed the full real Talos flow:

```text
Search -> Details -> Chapters -> Chapter Text -> Existing Novel Reader
```

The existing reader resolver path was validated, and the Expo web route rendered real Narou chapter text. Browser verification reported no console errors and no failed requests.

## E. Configuration-Required Providers

- `proxy-novel`: set `NOVEL_GATEWAY_URL` on the backend to a reachable, authorized, compatible service implementing search, details, chapters, and chapter content. The frontend may alternatively be pointed at a compatible Novel Backend URL through existing Sources settings.
- Narou does not require an API key, but the Talos backend must be reachable by the app.

## F. Failed Candidates

- Novel Updates: current request returned HTTP 403 with a Cloudflare challenge. No bypass was attempted.
- NovelBuddy: returned an HTTP redirect during the basic probe; no complete contract was verified.
- BookReadFree: homepage was reachable, but no search/details/chapter-content flow was verified.
- Royal Road and NovelFire: homepage access alone was insufficient to establish a complete reader contract.
- Narou metadata API: does not itself provide chapter text; the adapter uses the official public chapter pages for content.
- lncrawl/novel-api: no configured endpoint was available for live verification.

## G. Security Decisions

No CAPTCHA solving, Cloudflare bypass, anti-bot evasion, stealth browser behavior, fingerprint spoofing, proxy rotation, deliberate rate-limit evasion, authentication bypass, paywall bypass, DRM circumvention, geographic restriction bypass, SSRF, unrestricted arbitrary URL proxying, or executable download was added.

Sources requiring those techniques remain limited or unavailable. Cloudflare presence was treated as an access result, not as permission to bypass the control.

## H. License and Authorization Notes

Provider/parser source-code licenses, API/service authorization, and underlying novel/content rights are separate questions. An MIT, Apache, or GPL parser license does not grant permission to redistribute or display third-party novel content. Narou integration uses its official API/site as a source; operators remain responsible for applicable service terms and content rights.

## I. Test Evidence

- `backend`: `npm run build` — PASS.
- `node scripts/phase5.4-novel-smoke.mjs` — PASS for live Narou Search, Details, Chapters, and Chapter Text through the Talos backend gateway. One run returned 91 chapters and one real chapter paragraph; another returned 75 paragraphs.
- `node scripts/phase3-novel-smoke.mjs` — PASS after correcting a stale assertion that still expected a direct `novelGatewaySearch` import in the unified route.
- `node scripts/phase4-gateway-smoke.mjs` — PASS, including live `/health` content-gateway check while the backend was running.
- `node scripts/test-mangadex-classification.mjs` — PASS for manga, manhwa, and manhua regression coverage.
- Failure checks: empty query returned HTTP 400, invalid Narou novel returned HTTP 404, invalid chapter returned HTTP 404, and unconfigured `proxy-novel` returned HTTP 503 without demo fallback.
- `npm run typecheck` — blocked by the pre-existing missing `cursor/canvas` module declarations in `canvases/comic-source-matrix.canvas.tsx`.
- Browser automation on `http://localhost:8081/novel/narou__N6275JD/read/1` — PASS; the existing reader rendered real Narou text, with no console errors or failed requests.

## J. Final Coverage

```text
Novel:
Verified Working: 1 (Shosetsuka ni Narou)
Limited: 0
Requires Configuration: 1 (proxy-novel)
Unavailable / Blocked: 1 (Novel Updates current Cloudflare challenge)
Planned / Investigation: remaining candidates and extension ecosystems
```

No Step 5.5, source-management UI work, deployment, SQLite migration, or Phase 6 work was started.

**STEP 5.4 COMPLETE — WAITING FOR YOUR CONFIRMATION**
