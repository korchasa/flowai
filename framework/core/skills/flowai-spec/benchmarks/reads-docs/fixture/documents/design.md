# Software Design Specification

## 1. Introduction

- **Purpose:** Architecture of the e-commerce authentication system.
- **Relation to SRS:** Implements FR-AUTH from `documents/requirements.md`.

## 2. Architecture

- **Stack:** TypeScript, Deno, Fresh framework.
- **Components:**
  - `src/auth/` — Authentication module (OAuth2 flows, JWT handling).
  - `src/middleware/` — Auth middleware for protected routes.
  - `src/db/` — User storage (PostgreSQL via Drizzle ORM).
