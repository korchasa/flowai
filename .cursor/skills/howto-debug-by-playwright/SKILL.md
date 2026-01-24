---
name: howto-debug-by-playwright
description: Manually Test or Debug by Playwright MCP tools
---

## HOW TO MANUALLY TEST OR DEBUG BY PLAYWRIGHT MCP TOOLS

Always check applcation with Playwright MCP tools:

### Navigation
- browser_navigate — go to URL.
- browser_navigate_back — back in history.
- browser_tabs — manage tabs (get list, switch).

### Input and interaction
- browser_type — type text in field.
- browser_press_key — press key (Enter, Esc and others).
- browser_click — click on element.
- browser_hover — hover on element.
- browser_drag — drag element.
- browser_select_option — select option in <select>.
- browser_fill_form — fill form.
- browser_file_upload — upload file to input.
- browser_handle_dialog — handle dialog (alert, confirm, prompt).

### State and check
- browser_wait_for — wait for element to appear/disappear.
- browser_console_messages — get messages from browser console.
- browser_network_requests — monitor network requests.

### Screenshots and snapshots
- browser_take_screenshot — take screenshot of page or element.
- browser_snapshot — save DOM snapshot.

### Execution of code
- browser_evaluate — execute JavaScript directly in the context of the page.