---
date: "2026-05-20"
status: to do
implements: []
tags: [test-fixture]
related_tasks: []
---

# Add slugify helper

## Goal

A `slugify(title: string): string` helper in `slugify.ts` that turns a human title into a URL slug: lowercased, spaces and punctuation collapsed to single hyphens, leading/trailing hyphens trimmed. Wanted because three call sites build slugs inline today.

## Overview

### Context

URL slugs are produced ad-hoc across the codebase. A single helper removes duplication and centralises the rule.

### Current State

No `slugify.ts` exists yet. This is a fresh single-function module.

### Constraints

- Deno + TypeScript strict.
- No external dependencies — plain string operations + a regex.
- One test file: `slugify_test.ts`.

## Definition of Done

- [ ] Exported `slugify` lowercases, replaces runs of non-alphanumerics with a single `-`, and trims leading/trailing `-`.
  - Test: `slugify_test.ts::slugify builds a url slug`
  - Evidence: `deno test -A slugify_test.ts`
- [ ] `slugify("  Hello, World!  ")` returns `"hello-world"`.
  - Test: `slugify_test.ts::slugify trims and collapses`
  - Evidence: `deno test -A slugify_test.ts`
- [ ] `deno task check` exits 0.
  - Evidence: `deno task check`

## Solution

1. **RED**: write a failing test in `slugify_test.ts` calling `slugify("  Hello, World!  ")` and expecting `"hello-world"`. Run `deno test` — it MUST fail (no `slugify` exported yet).
2. **GREEN**: implement `slugify(title: string): string` in `slugify.ts` — `title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")`. Re-run the test — it MUST pass.
3. **REFACTOR**: extract the two regexes to named constants if it improves readability; behaviour unchanged. Re-run.
4. **CHECK**: run `deno task check`. It MUST exit 0.
