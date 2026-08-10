---
date: 2026-04-15
status: in progress
implements:
  - FR-RATE-LIMIT
tags:
  - api
  - reliability
related_tasks: []
---

# Add token-bucket rate limiter to public API

## Goal

Limit per-API-key request rate so misbehaving clients can't exhaust the worker pool.

## Overview

### Context

Public API has no per-client rate limit. A handful of misbehaving clients can exhaust the worker pool and degrade service for everyone. We need a per-API-key cap that is cheap to evaluate (in-memory) and tunable per route.

### Current State

No rate-limit middleware exists.

### Constraints

- Must not require external infrastructure (single-region deploy).
- Must be tunable per route.

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
