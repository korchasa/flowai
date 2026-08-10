# Add Users API Endpoints

## Goal

Add REST API endpoints for user management.

## Overview

### Context

The project needs a user management API with both listing and creation endpoints.

### Current State

No API endpoints exist. Only math utilities.

### Constraints

- Must use simple HTTP handler pattern.

## Definition of Done

- [ ] GET `/users` endpoint returns user list
- [ ] POST `/users` endpoint creates a new user with validation
- [ ] New requirements documented in requirements.md

## Solution

1. Create `api.ts` with handlers for GET and POST `/users`
2. Add input validation for POST endpoint
3. Update requirements.md with new FRs
