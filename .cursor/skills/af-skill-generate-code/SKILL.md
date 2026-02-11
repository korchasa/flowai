---
name: af-skill-generate-code
description: Enforce strict code generation rules regarding architecture, security, error handling, and production readiness. Use when generating code, designing architecture, or implementing features to ensure best practices.
---

# Code Generation Rules

## Architecture
- No abstraction without 3+ current consumers. No "future-proofing."
- No Factory/Strategy/Observer/ABC in projects < 1000 LOC unless asked.
- Check existing code before creating new files/classes/functions. Reuse > create.
- Functions over classes when no state. Flat over nested.
- Match project structure. Don't reorganize without being asked.

## Security (always, no reminders needed)
- Validate and sanitize all user input at entry point.
- SQL: parameterized queries only. Never concatenate.
- Secrets: env vars or secret manager. Never in code, configs, comments, logs.
- Every HTTP endpoint: authenticated + authorized by default. Public = explicit opt-in.
- After generating auth/crypto/file/network code: add "⚠️ Security" section listing risks.

## Error Handling
- No empty catch/except.
- No catch-all (catch Exception) without re-raise or explicit recovery.
- Every external call (HTTP, DB, FS, queue): timeout + failure handling.
- Test boundaries: null, empty collections, zero, negative, max values.
- Errors must say what failed, where, with what input. No secret leakage.

## Dependencies
- Only use packages you're certain exist. If unsure — say so, don't guess.
- Pin versions. No latest/newest.
- No deprecated APIs. If one is deprecated — suggest current replacement.

## Tech Recommendations
- Don't suggest stack changes unless current stack can't solve the problem.
- If suggesting alternatives: state the specific problem with current approach, not general superiority.
- Factor in team size, budget, ops burden — not just technical merit.

## Production Readiness (backend services)
- Structured logging: JSON, severity levels, correlation_id.
- Health check endpoint with dependency checks.
- Timeouts on all external calls. No unbounded waits.
- Graceful shutdown: SIGTERM → drain in-flight → exit.
- Resource limits: connection pools, rate limits, memory bounds.
