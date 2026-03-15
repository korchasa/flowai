# Browser Session Management

Run multiple isolated browser sessions concurrently with state persistence.

## Named Sessions

Use `-s` flag to isolate browser contexts:

```bash
playwright-cli -s=auth open https://app.example.com/login
playwright-cli -s=public open https://example.com
```

## Session Commands

- `playwright-cli list` — List all active sessions
- `playwright-cli [-s=name] close` — Stop specific browser
- `playwright-cli close-all` — Stop all browsers
- `playwright-cli kill-all` — Forcefully kill all daemon processes
- `playwright-cli [-s=name] delete-data` — Delete session user data

## Persistence

By default, profiles are in-memory. Use `--persistent` to save to disk:

```bash
playwright-cli open https://example.com --persistent
playwright-cli open https://example.com --profile=/path/to/profile
```
