---
name: flow-skill-playwright-cli
description: Automates browser interactions for web testing, form filling, screenshots, and data extraction using playwright-cli. Use when the user needs to navigate websites, interact with web pages, fill forms, take screenshots, test web applications, or extract information from web pages.
---

# Browser Automation with playwright-cli

## Quick Start

```bash
# open new browser
playwright-cli open
# navigate to a page
playwright-cli goto https://playwright.dev
# interact with the page using refs from the snapshot
playwright-cli click e15
playwright-cli type "page.click"
playwright-cli press Enter
# take a screenshot
playwright-cli screenshot
# close the browser
playwright-cli close
```

## Core Commands

### Session & Navigation

- `playwright-cli open [url] [--headed]` — Open browser (optional URL, use `--headed` for visible window)
- `playwright-cli goto <url>` — Navigate to URL
- `playwright-cli go-back` / `go-forward` / `reload`
- `playwright-cli close` — Close current browser

### Interaction

- `playwright-cli click <ref>` — Click element by snapshot reference
- `playwright-cli fill <ref> <value>` — Fill form field
- `playwright-cli type <text>` — Type text
- `playwright-cli press <key>` — Press key (e.g., `Enter`, `ArrowDown`)
- `playwright-cli hover <ref>` — Hover over element
- `playwright-cli select <ref> <value>` — Select dropdown option
- `playwright-cli upload <path>` — Upload file

### Observation

- `playwright-cli snapshot [--filename=...]` — Capture accessibility snapshot (preferred over screenshot)
- `playwright-cli screenshot [<ref>] [--filename=...]` — Take screenshot
- `playwright-cli eval <js>` — Evaluate JS on page

## Advanced Features

For detailed instructions on specialized tasks, refer to:

- [Request Mocking](references/request-mocking.md) — Intercept and mock network requests
- [Running Custom Code](references/running-code.md) — Execute arbitrary Playwright JS code
- [Session Management](references/session-management.md) — Named sessions and isolation
- [Storage & State](references/storage-state.md) — Cookies, localStorage, auth state
- [Test Generation](references/test-generation.md) — Converting actions to test code
- [Tracing & Video](references/tracing.md) — Debugging with traces and recordings

## Best Practices

1. **Snapshot First**: Always run `playwright-cli snapshot` after navigation or state changes to get element references (`e1`, `e2`, etc.).
2. **Named Sessions**: Use `-s=name` for multiple isolated browser contexts.
3. **Clean Up**: Always run `playwright-cli close` or `playwright-cli close-all` when finished.
4. **Prefer Snapshots**: Snapshots provide structured accessibility data which is better for AI reasoning than raw screenshots.
