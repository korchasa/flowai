# Add Users API Endpoint

## Goal

Add a REST API endpoint `/users` to expose user management functionality.

## Overview

### Context

The project needs a user management API. The `/users` endpoint will support listing all users (GET).

### Current State

No API endpoints exist. Only math utilities.

### Constraints

- Must use simple HTTP handler pattern.

## Definition of Done

- [ ] GET `/users` endpoint returns user list
- [ ] New requirement documented in requirements.md

## Solution

1. Create `api.ts` with handler for `/users`
2. Update requirements.md with new FR for user API
