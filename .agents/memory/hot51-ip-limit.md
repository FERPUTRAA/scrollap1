---
name: Hot51 IP_LIMIT bypass strategy
description: Which headers trigger IP_LIMIT (G10001) and which bypass it, per endpoint type
---

## Core Rule
Hot51's geo-block (G10001 `IP_LIMIT`) behaves differently depending on HTTP method and headers:

- **GET /lids endpoints** (`/plr/v4/public/live/lids`, `/plr/scrolliv/live/app/liveCenter/lids`):  
  - Full Cronet APK headers (`client-type`, `versionCode`, `dev-type`, `system-version`) → **IP_LIMIT**  
  - Minimal headers (`merchantId`, `ac`, `User-Agent: okhttp/4.12.0`) → **works**

- **POST endpoints** (`/room-info`, `/swipeSwitch`, etc.):  
  - Full Cronet APK headers → **IP_LIMIT** (G10001)  
  - Minimal headers (any combo) → **401 Unauthorized** (needs full auth)  
  - Only fix: proxy through Cloudflare Worker (non-US IP bypasses block)

**Why:** Hot51 appears to apply stricter geo-blocking when requests look like real Android APK traffic (Cronet UA + APK-specific headers), but allows minimal/browser-like requests for GET discovery endpoints.

## Fix Applied
`getLidsHeaders()` function uses minimal headers for `/lids` GET calls. Never use `APP_HEADERS` or `getGuestGetHeaders()` for `/lids`.

## CF Worker Mode 3
Added `/api?url=` endpoint to `cloudflare-worker/hot51-proxy.js` that forwards all headers + method + body. Must be deployed by user to enable POST API proxying (room-info, swipeSwitch, toy/send).

**How to apply:** For any POST endpoint that gets G10001, use `cfWorkerPost(url, headers, body)` first, fall back to direct only if CF Worker returns no useful data (no `ann`/`lid`/`unlDefPa` fields).
