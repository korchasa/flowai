# SRS — DemoProject

## 1. Intro

- **Desc:** Minimal SRS for benchmark fixture.

## 3. Functional Requirements

### 3.1 FR-CACHE: Local Cache for Repeated Lookups

- **Desc:** CLI tool caches API responses locally so repeated lookups skip the network.
- **Scenario:** User runs the CLI twice in a row; the second invocation hits the cache and returns in <10 ms.
- **Acceptance:** `tests/cache_test.ts::repeat_hit`
- **Status:** [x]

### 3.2 FR-AUTH: Token-Based Authentication

- **Desc:** All API calls authenticate via a bearer token loaded from the `API_TOKEN` env var.
- **Scenario:** Missing/empty `API_TOKEN` → CLI exits non-zero with a clear error message.
- **Acceptance:** `tests/auth_test.ts::missing_token`
- **Status:** [x]

### 3.3 FR-LOG: Structured Logging

- **Desc:** All log output is JSON lines on stderr.
- **Scenario:** Stderr produces one valid JSON object per line; no plain-text mixed in.
- **Acceptance:** `tests/log_test.ts::json_lines`
- **Status:** [ ]
