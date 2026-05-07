---
date: 2026-04-20
status: to do
implements:
  - FR-SEARCH-PAGE
tags:
  - search
related_tasks: []
---

# Add Search Page

## Goal

Provide a search page so users can find products.

## Overview

### Context

No search UI exists yet. We have backend `/api/search` already.

### Current State

- Backend search endpoint exists.
- No frontend page.

### Constraints

- Must reuse existing `<ProductCard>` component.

## Definition of Done

- [x] FR-SEARCH-PAGE: page renders results from /api/search.
  - Test: `tests/search_page_test.ts::renders results`
  - Evidence: `deno test tests/search_page_test.ts`
- [ ] FR-SEARCH-PAGE: pagination via query string.
  - Test: `tests/search_page_test.ts::paginates`
  - Evidence: `deno test tests/search_page_test.ts`
- [ ] FR-SEARCH-PAGE: empty-state messaging.
  - Test: `tests/search_page_test.ts::empty state`
  - Evidence: `deno test tests/search_page_test.ts`

## Solution

Implemented `<SearchPage>` component that fetches `/api/search` and renders results in a grid.
