---
date: 2026-04-30
status: in progress
implements:
  - FR-CACHE
tags:
  - cache
  - performance
related_tasks: []
---
# Add Local Cache for CLI Tool

## Goal

Speed up repeated lookups in the CLI by caching API responses locally so the user
doesn't pay network round-trip on every invocation.

## Overview

### Context

The CLI fetches metadata for ~100 IDs per session, with ~80% repeat rate. Each
network call takes ~150ms. Without a cache, a single session burns ~10s on
duplicate fetches.

### Current State

No cache. Every CLI invocation re-fetches everything from the API.

### Constraints

Single-process CLI. Single user. Total dataset fits in <50MB. No cross-process
sharing required.

## Definition of Done

- [ ] FR-CACHE: cache hit ratio ≥80% on a typical session.
  - Test: tests/cache_test.ts::repeat_hit
  - Evidence: `deno task test cache`

## Solution

We considered three caching backends:

1. **Redis** — production-grade distributed cache. Pros: shared across processes,
   battle-tested, rich data types. Cons: requires running a Redis daemon, network
   round-trip even for local hits, operational overhead (start/stop, monitoring,
   eviction tuning).
2. **In-memory LRU** — simple Map-based cache with size cap and last-recently-used
   eviction. Pros: zero infra, sub-microsecond lookups, fits perfectly in a
   single-process CLI. Cons: cache resets on every CLI restart (acceptable for our
   <80% hit-rate target which is per-session, not cross-session).
3. **DynamoDB cache** — managed key-value store on AWS. Pros: serverless, durable,
   highly available. Cons: per-call latency dominates the lookup we're trying to
   accelerate (single GetItem is ~10–30ms versus Redis at ~1ms or in-memory at
   ~1μs); cost; AWS lock-in.

**Decision:** picked **in-memory LRU** because the workload is single-process
single-user with a dataset that fits in <50MB, so neither cross-process sharing
nor durability matters; Redis adds unjustified operational overhead, DynamoDB
latency dominates the simple lookup we're doing. The cache MUST cap at 50MB and
evict on LRU.

Implementation:

- Create `src/cache.ts` with `LRUCache<K, V>` class (capacity-bounded, eviction on
  set when full).
- Wire into `src/api_client.ts::fetchMetadata` — cache key = method + URL.
- Add `tests/cache_test.ts::repeat_hit` — populate, re-request, assert no network
  call on second access.
