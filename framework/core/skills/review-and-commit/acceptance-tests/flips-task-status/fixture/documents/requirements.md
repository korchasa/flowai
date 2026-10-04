# SRS

## 1. Intro

- **Desc:** Public HTTP API for report submission.

## 3. Functional Reqs

### 3.1 FR-RATE-LIMIT: Per-key request cap [ANC:fr:rate-limit]

- **Desc:** Cap requests per API key with an in-memory token bucket; answer 429
  when a key's bucket is empty. Tunable per route.
- **Scenario:** A client exceeds its bucket and receives 429 instead of a
  handler response.
- **Acceptance:** `deno test src/api/middleware/rate_limit_test.ts`
- **Tasks:** [REF:task:add-rate-limiter | add-rate-limiter]
- **Status:** [ ]

## 4. Non-Functional

- **Perf:** Bucket evaluation is O(1) per request and holds no external state.

## 6. Acceptance

- **Criteria:** Every FR above carries a runnable acceptance reference.
