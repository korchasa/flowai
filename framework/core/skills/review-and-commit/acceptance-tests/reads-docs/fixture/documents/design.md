# Software Design Specification

## 1. Introduction

- **Purpose:** Architecture of the file processing CLI.
- **Relation to SRS:** Implements FR-PROCESS from `documents/requirements.md`.

## 2. Architecture

- **Stack:** TypeScript, Deno.
- **Components:**
  - `src/cli.ts` — CLI entry point (Cliffy).
  - `src/processor.ts` — File transformation logic.
  - `src/io.ts` — File read/write utilities.
