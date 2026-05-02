---
id: ADR-0042
status: accepted
date: 2026-04-15
implements:
  - FR-RATE-LIMIT
tags:
  - api
  - reliability
---

# Add token-bucket rate limiter to public API

## Context

Public API has no per-client rate limit. A handful of misbehaving clients can exhaust the worker pool and degrade service for everyone. We need a per-API-key cap that is cheap to evaluate (in-memory) and tunable per route.

## Alternatives

- **Token-bucket per API key (in-memory)** `(CHOSEN)` — ring of buckets keyed by API key; refill timer per route.
  - Pros: cheap, no external dependency, easy to tune per route.
  - Cons: not shared across replicas (acceptable for our single-region deploy).
- **Redis-backed sliding window** — central counter in Redis.
  - Pros: shared across replicas, exact accounting.
  - Cons: extra infrastructure, network hop on every request.
  - Rejected because: we run a single replica today and Redis adds an ops dependency we don't otherwise need.

## Decision

Implement an in-memory token-bucket rate limiter as middleware on `src/api/middleware/rate_limit.ts`, keyed by `X-API-Key` header, default 60 req/min, override per route via decorator metadata.

## Consequences

- New middleware file.
- `src/api/server.ts` registers the middleware.
- New `429 Too Many Requests` response shape documented in OpenAPI spec.

## Definition of Done

- [x] FR-RATE-LIMIT: middleware enforces per-key bucket; returns 429 when bucket empty.
  - Test: `src/api/middleware/rate_limit_test.ts::enforces_bucket`
  - Evidence: `deno test src/api/middleware/rate_limit_test.ts`
- [x] FR-RATE-LIMIT: middleware registered in server pipeline before route handlers.
  - Test: `src/api/server_test.ts::registers_rate_limit`
  - Evidence: `deno test src/api/server_test.ts`
- [x] FR-RATE-LIMIT: per-route override via decorator metadata.
  - Test: `src/api/middleware/rate_limit_test.ts::per_route_override`
  - Evidence: `deno test src/api/middleware/rate_limit_test.ts`

## Solution

1. Add `src/api/middleware/rate_limit.ts` exporting `rateLimit(opts)` middleware factory.
2. Implement token-bucket data structure with `Map<apiKey, Bucket>` and per-route refill rate.
3. Register middleware in `src/api/server.ts` before route mounting.
4. Add tests in `src/api/middleware/rate_limit_test.ts` covering bucket enforcement and per-route override.
