# Software Requirements Specification

## 1. Introduction

- **Desc:** API service for managing user tasks with caching support.

## 3. Functional Requirements

### FR-CACHE: Caching Layer

- **Desc:** All GET endpoints must support Redis-based caching with configurable TTL.
- **Acceptance:**
  - [ ] Cache middleware for Express routes.
  - [ ] TTL configurable per endpoint via env vars.
