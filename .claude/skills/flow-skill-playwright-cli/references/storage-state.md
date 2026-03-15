# Storage Management

Manage cookies, localStorage, sessionStorage, and browser storage state.

## Storage State

Save and restore complete browser state (cookies + storage).

```bash
playwright-cli state-save [filename.json]
playwright-cli state-load [filename.json]
```

## Cookies

- `playwright-cli cookie-list [--domain=...]`
- `playwright-cli cookie-get <name>`
- `playwright-cli cookie-set <name> <value> [options]`
- `playwright-cli cookie-delete <name>`
- `playwright-cli cookie-clear`

## Local & Session Storage

- `playwright-cli localstorage-list` / `sessionstorage-list`
- `playwright-cli localstorage-get <key>`
- `playwright-cli localstorage-set <key> <value>`
- `playwright-cli localstorage-delete <key>`
- `playwright-cli localstorage-clear`

## Auth Reuse Pattern

1. Login in browser.
2. `playwright-cli state-save auth.json`.
3. In new session: `playwright-cli state-load auth.json`.
4. `playwright-cli open <url>` — already logged in.
