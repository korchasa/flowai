---
date: 2026-04-01
status: done
implements:
  - FR-AUTH-LOGIN
tags: [auth, ui]
related_tasks: []
---
# Add Login Form

## Goal

Provide a login UI so users can authenticate.

## Overview

### Context

Initial auth scope. Users have email+password creds; we need a form.

### Current State

No login UI exists.

### Constraints

- Must use the existing `<AuthClient>` component.

## Definition of Done

- [x] FR-AUTH-LOGIN: form renders and submits credentials
  - Test: `tests/login_form_test.ts::renders form`
  - Evidence: `deno test tests/login_form_test.ts`

## Solution

Implemented `<LoginForm>` component wired to `<AuthClient.signin>`.
