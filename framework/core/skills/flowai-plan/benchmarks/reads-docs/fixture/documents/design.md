# Software Design Specification

## 1. Introduction

- **Purpose:** Detail the architecture of the TaskAPI service.
- **Relation to SRS:** Implements requirements from `documents/requirements.md`.

## 2. Architecture

- **Stack:** TypeScript, Deno, Oak framework.
- **Components:**
  - `src/server.ts` — HTTP server entry point.
  - `src/routes/` — Route handlers.
  - `src/cache/` — Cache adapter (currently in-memory, to be replaced with Redis).
