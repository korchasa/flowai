# SDS

## 1. Intro

- **Purpose:** How the per-key rate limit in [REF:fr:rate-limit | FR-RATE-LIMIT]
  is built.
- **Rel to SRS:** Implements [REF:fr:rate-limit | FR-RATE-LIMIT].

## 2. Arch

- **Subsystems:** `src/api/middleware/` (request filters), `src/api/server.ts`
  (pipeline assembly).

## 3. Components

### 3.1 Rate-limit middleware [ANC:sds:rate-limit]

- **Purpose:** Token bucket per API key, refilled by elapsed time.
- **Interfaces:** `rateLimit(opts)` returns a filter; the filter answers a
  `Response` when the request is rejected and `null` when it may proceed.
- **Deps:** None beyond the standard library.

## 5. Logic

- **Rules:** The key is the `X-API-Key` header, `anon` when absent. Refill is
  proportional to elapsed time and capped at the configured limit.

## 7. Constraints

- **Simplified:** In-memory only, so buckets do not survive a restart and are
  not shared across instances.
