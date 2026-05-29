---
date: 2026-05-12
status: superseded
superseded_by: 2026/05/session-auth-refresh.md
implements:
  - FR-AUTH-REFRESH
tags:
  - auth
related_tasks:
  - 2026/05/session-auth-refresh.md
---

# Old Auth Refresh

## Goal

Refresh auth tokens without forcing a sign-in.

## Overview

### Context

This task was replaced by `session-auth-refresh.md`, which widened scope to
session storage migration.

### Current State

- Original task no longer maps to the shipped design.

### Constraints

- Keep this record for provenance.

## Definition of Done

- [x] FR-AUTH-REFRESH: token refresh uses the new endpoint.
  - Test: `tests/auth_refresh_test.ts::refreshes token`
  - Evidence: `deno test tests/auth_refresh_test.ts`
- [ ] FR-AUTH-REFRESH: session migration is complete.
  - Test: `tests/session_migration_test.ts::migrates refresh tokens`
  - Evidence: `deno test tests/session_migration_test.ts`

## Solution

Superseded by `session-auth-refresh.md`.
