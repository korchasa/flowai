/**
 * trace-styles.ts — CSS and JS for the HTML trace report.
 */

/** Returns the full CSS stylesheet for the HTML report. */
export function getCSS(): string {
  return `
    :root {
      --bg-main: #f5f5f5;
      --bg-panel: #ffffff;
      --bg-nav: #020129;
      --text-main: #0a0a0a;
      --text-muted: #717171;
      --text-on-dark: #fafafa;
      --border-color: #e5e5e5;
      --accent-color: #020129;
      --error-color: #e7000b;
      --success-color: #2e7d32;
      --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    }

    body {
      font-family: var(--font-mono);
      line-height: 1.6;
      color: var(--text-main);
      background: var(--bg-main);
      margin: 0;
      padding: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .main-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
      width: 100%;
    }
    .scenarios-container {
      flex: 1;
      overflow-y: auto;
      padding: 32px;
      scroll-behavior: smooth;
    }
    .toc-panel {
      width: 320px;
      background: var(--bg-panel);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .toc-header {
      padding: 20px;
      border-bottom: 1px solid var(--border-color);
    }
    .toc-search {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      font-family: var(--font-mono);
      font-size: 0.9em;
      outline: none;
    }
    .toc-search:focus {
      border-color: var(--accent-color);
    }
    .toc-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    .toc-panel h3 { margin-top: 0; font-size: 1.1em; padding-bottom: 12px; font-weight: bold; cursor: pointer; }
    .toc-panel h3:hover { color: var(--accent-color); }
    .toc-panel ul { list-style: none; padding: 0; margin: 0; }
    .toc-panel li {
      margin-bottom: 4px;
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.85em;
      border-radius: 4px;
    }
    .toc-panel li:hover { background: var(--bg-main); }
    .toc-panel li.active { background: var(--accent-color); color: var(--text-on-dark); }
    .toc-status { font-weight: bold; width: 1.2em; text-align: center; }
    .toc-scenario { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .toc-group { margin-bottom: 20px; }
    .toc-group-title { font-weight: bold; color: var(--text-main); font-size: 0.9em; margin-bottom: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; }
    .toc-group ul { padding-left: 0; }

    .dashboard-table { width: 100%; border-collapse: collapse; }
    .dashboard-table th, .dashboard-table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border-color); }
    .dashboard-table th { font-size: 0.8em; color: var(--text-muted); text-transform: uppercase; }
    .text-right { text-align: right !important; }
    .total-row { font-weight: bold; background: var(--bg-main); }
    .total-row td { border-top: 2px solid var(--accent-color); }
    .status-pass { color: var(--success-color); font-weight: bold; }
    .status-fail { color: var(--error-color); font-weight: bold; }
    .status-pending { color: var(--text-muted); }

    .scenario-section { display: none; }
    .scenario-section.active { display: block; }
    .scenario-header {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .scenario-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }
    .header-actions {
      display: flex;
      gap: 10px;
    }
    .action-btn {
      background: var(--bg-nav);
      color: var(--text-on-dark);
      border: none;
      padding: 8px 16px;
      font-family: var(--font-mono);
      font-size: 0.8em;
      font-weight: bold;
      cursor: pointer;
    }
    .action-btn:hover { opacity: 0.9; }

    h1 { margin: 0; color: var(--text-main); font-size: 2em; font-weight: bold; letter-spacing: -1px; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 20px;
      font-size: 0.85em;
      color: var(--text-muted);
    }
    .meta-item b { color: var(--text-main); }

    .nav-bar {
      height: 50px;
      background: var(--bg-nav);
      color: var(--text-on-dark);
      padding: 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .nav-links a { color: var(--text-on-dark); text-decoration: none; font-size: 0.9em; font-weight: bold; }

    /* Step Grouping */
    .step-separator {
      margin-top: 32px;
      margin-bottom: 16px;
      border-bottom: 2px solid var(--accent-color);
      padding-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .step-separator h2 {
      margin: 0;
      font-size: 1.2em;
      color: var(--accent-color);
      font-weight: bold;
    }
    .step-separator .line {
      flex-grow: 1;
      height: 1px;
      background: var(--border-color);
    }

    /* Event Styles */
    .event {
      background: var(--bg-panel);
      border: 1px solid var(--border-color);
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
    }
    .event-group {
      margin-bottom: 16px;
      border: 1px solid var(--border-color);
      background: var(--bg-panel);
    }
    .event-group .event {
      border: none;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 0;
    }
    .event-group .event:last-child {
      border-bottom: none;
    }
    .event-header {
      padding: 8px 16px;
      background: var(--bg-main);
      display: flex;
      align-items: center;
      gap: 12px;
      user-select: none;
      border-bottom: 1px solid var(--border-color);
    }
    .timestamp { color: var(--text-muted); font-size: 0.8em; }
    .type-icon { font-size: 1.1em; }
    .type {
      text-transform: uppercase;
      font-size: 0.65em;
      font-weight: bold;
      padding: 2px 6px;
      background: var(--accent-color);
      color: var(--text-on-dark);
    }
    .title { font-weight: bold; flex-grow: 1; color: var(--text-main); font-size: 0.9em; }
    .step-badge {
      font-size: 0.65em;
      background: var(--text-muted);
      color: var(--text-on-dark);
      padding: 2px 6px;
    }
    .content {
      padding: 16px;
      font-size: 0.9em;
    }

    .event-message[data-role="user"] { border-top: 3px solid var(--accent-color); }
    .event-message[data-role="assistant"] { border-top: 3px solid var(--text-muted); }
    .event-interaction { border-top: 3px solid var(--accent-color); }
    .event-command { border-top: 3px solid var(--text-muted); }
    .event-evaluation { border-top: 3px solid var(--accent-color); }
    .event-summary { border-top: 3px solid var(--accent-color); }

    .data-block {
      position: relative;
      display: flex;
      flex-direction: column;
      margin: 8px 0;
      border: 1px solid var(--border-color);
    }
    .data-content {
      background: #fdfdfd;
    }
    .blur-overlay {
      display: none;
    }
    .expand-btn-container {
      display: none;
    }
    .expand-btn {
      background: var(--bg-nav);
      border: none;
      color: var(--text-on-dark);
      padding: 6px 16px;
      cursor: pointer;
      font-size: 0.75em;
      font-weight: bold;
      display: none;
      font-family: var(--font-mono);
      align-items: center;
      gap: 6px;
    }
    .expand-btn:hover { opacity: 0.9; }
    .expand-btn svg { transition: transform 0.3s ease; }
    .data-content.expanded ~ .expand-btn-container .expand-btn svg { transform: rotate(180deg); }
    .data-content.expanded ~ .expand-btn-container { margin-top: 8px; }

    pre {
      background: #f8f8f8;
      padding: 12px;
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      border: none;
      font-size: 0.95em;
    }
    code { font-family: var(--font-mono); color: var(--text-main); }

    .hljs-ln-numbers {
      user-select: none;
      text-align: center;
      color: #ccc;
      border-right: 1px solid var(--border-color);
      vertical-align: top;
      padding-right: 8px !important;
      font-size: 0.85em;
    }
    .hljs-ln-code { padding-left: 12px !important; }

    .summary-card {
      background: var(--bg-panel);
      padding: 20px;
      display: flex;
      justify-content: space-around;
      text-align: center;
      border: 1px solid var(--border-color);
      border-top: 6px solid var(--accent-color);
      margin-bottom: 24px;
    }
    .metric-value { display: block; font-size: 1.5em; font-weight: bold; color: var(--text-main); }
    .metric-label { font-size: 0.7em; color: var(--text-muted); text-transform: uppercase; font-weight: bold; margin-top: 2px; }

    .content h3 { margin-top: 16px; margin-bottom: 8px; font-size: 1.1em; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; }
    .content blockquote {
      border-left: 4px solid var(--accent-color);
      margin: 0;
      padding: 8px 16px;
      background: var(--bg-main);
      color: var(--text-main);
      font-style: italic;
    }

    /* Highlight.js overrides */
    .hljs { background: transparent; color: var(--text-main); }
    .hljs-keyword { color: #0000ff; }
    .hljs-string { color: #a31515; }
    .hljs-comment { color: #008000; }
    `;
}

/** Returns the JavaScript for the HTML report (navigation, search, collapsibles). */
export function getJS(): string {
  return `
    function showScenario(id) {
      document.querySelectorAll('.toc-panel li').forEach(li => {
        li.classList.toggle('active', li.getAttribute('data-id') === id);
      });
      document.querySelectorAll('.scenario-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === (id === 'overview' ? 'overview' : 'scenario-' + id));
      });
      document.querySelector('.scenarios-container').scrollTop = 0;
      history.replaceState(null, null, id === 'overview' ? ' ' : '#scenario-' + id);
    }

    function filterScenarios(text) {
      const query = text.toLowerCase();
      document.querySelectorAll('.toc-group').forEach(group => {
        let groupVisible = false;
        group.querySelectorAll('li').forEach(li => {
          const name = li.querySelector('.toc-scenario').textContent.toLowerCase();
          const visible = name.includes(query);
          li.style.display = visible ? 'flex' : 'none';
          if (visible) groupVisible = true;
        });
        group.style.display = groupVisible ? 'block' : 'none';
      });
    }

    function toggleRunGroup(groupId) {
      const rows = document.querySelectorAll('.run-group-' + groupId);
      const visible = rows.length > 0 && rows[0].style.display !== 'none';
      rows.forEach(r => r.style.display = visible ? 'none' : 'table-row');
    }

    function toggleAll(scenarioId, expand) {
      // No-op as we removed clipping, but keeping for compatibility
    }

    function toggleExpand(btn) {
      const container = btn.closest('.data-block');
      const inner = container.querySelector('.data-content');
      inner.classList.toggle('expanded');
      const label = btn.querySelector('span');
      label.textContent = inner.classList.contains('expanded') ? 'SHOW LESS' : 'SHOW MORE';
    }

    function initCollapsibles() {
      document.querySelectorAll('.data-content').forEach(inner => {
        if (inner.scrollHeight > inner.offsetHeight + 5) {
          const container = inner.closest('.data-block');
          container.classList.add('has-overflow');
          const btn = container.querySelector('.expand-btn');
          if (btn) btn.style.display = 'flex';
        }
      });
    }

    document.addEventListener('DOMContentLoaded', (event) => {
      document.querySelectorAll('pre code').forEach((el) => {
        hljs.highlightElement(el);
        hljs.lineNumbersBlock(el);
      });
      initCollapsibles();
      const hash = window.location.hash;
      if (hash && hash.startsWith('#scenario-')) {
        showScenario(hash.replace('#scenario-', ''));
      } else {
        showScenario('overview');
      }
    });

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#scenario-')) {
        showScenario(hash.replace('#scenario-', ''));
      }
    });
    `;
}
