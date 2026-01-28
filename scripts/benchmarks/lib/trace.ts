import { join } from "@std/path";

export type TraceSource = "agent" | "judge" | "user_emulation" | "system";

export interface TraceEvent {
  type: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  content: string;
  scenarioId: string;
}

export interface ScenarioMetadata {
  name: string;
  id: string;
  model: string;
  agentPath: string;
  userQuery: string;
  date: string;
  summary?: {
    success: boolean;
    score: number;
    durationMs: number;
    tokensUsed: number;
    totalCost: number;
    errors: number;
    warnings: number;
  };
}

export class TraceLogger {
  private tracePath: string;
  private events: TraceEvent[] = [];
  private scenarios: Map<string, ScenarioMetadata> = new Map();
  private currentScenarioId: string | null = null;

  constructor(workDir: string, filename = "trace.html") {
    this.tracePath = join(workDir, filename);
  }

  private async save() {
    if (this.scenarios.size === 0) return;

    const html = this.render();
    await Deno.writeTextFile(this.tracePath, html);
  }

  private wrapCollapsible(content: string, style = ""): string {
    return `
      <div class="data-block" ${style ? `style="${style}"` : ""}>
        <div class="data-content">${content}</div>
        <div class="blur-overlay"></div>
        <div class="expand-btn-container">
          <button class="expand-btn" onclick="toggleExpand(this)">
            <span>SHOW MORE</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  private formatScenarioName(id: string, name: string): string {
    if (id.startsWith("af-")) {
      const parts = id.split("-");
      if (parts.length >= 2) {
        const skill = `af-${parts[1]}`;
        return `${skill}: ${name}`;
      }
    }
    return name;
  }

  private render(): string {
    const scenarios = Array.from(this.scenarios.values());

    // Simple HTML escaping
    const escape = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const dashboardHtml = `
      <section class="dashboard">
        <h2>BENCHMARK DASHBOARD</h2>
        <table class="dashboard-table">
          <thead>
            <tr>
              <th>SCENARIO</th>
              <th class="text-right">RESULT</th>
              <th class="text-right">SCORE</th>
              <th class="text-right">ERR/WRN</th>
              <th class="text-right">DURATION</th>
              <th class="text-right">TOKENS</th>
              <th class="text-right">COST ($)</th>
            </tr>
          </thead>
          <tbody>
            ${
      scenarios.map((s) => {
        const statusClass = s.summary
          ? (s.summary.success ? "status-pass" : "status-fail")
          : "status-pending";
        const statusText = s.summary
          ? (s.summary.success ? "PASSED" : "FAILED")
          : "PENDING";
        return `
                <tr>
                  <td><a href="#scenario-${s.id}">${
          escape(this.formatScenarioName(s.id, s.name))
        }</a></td>
                  <td class="${statusClass} text-right">${statusText}</td>
                  <td class="text-right">${
          s.summary ? s.summary.score.toFixed(1) + "%" : "-"
        }</td>
                  <td class="text-right">${
          s.summary ? `${s.summary.errors}/${s.summary.warnings}` : "-"
        }</td>
                  <td class="text-right">${
          s.summary ? (s.summary.durationMs / 1000).toFixed(1) + "s" : "-"
        }</td>
                  <td class="text-right">${
          s.summary ? s.summary.tokensUsed : "-"
        }</td>
                  <td class="text-right">${
          s.summary ? "$" + s.summary.totalCost.toFixed(6) : "-"
        }</td>
                </tr>
              `;
      }).join("")
    }
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td>TOTAL</td>
              <td class="text-right">${
      scenarios.every((s) => s.summary?.success) ? "PASSED" : "FAILED"
    }</td>
              <td class="text-right">${
      (scenarios.reduce((acc, s) => acc + (s.summary?.score || 0), 0) /
        scenarios.length).toFixed(1)
    }%</td>
              <td class="text-right">${
      scenarios.reduce((acc, s) => acc + (s.summary?.errors || 0), 0)
    }/${scenarios.reduce((acc, s) => acc + (s.summary?.warnings || 0), 0)}</td>
              <td class="text-right">${
      (scenarios.reduce((acc, s) => acc + (s.summary?.durationMs || 0), 0) /
        1000).toFixed(1)
    }s</td>
              <td class="text-right">${
      scenarios.reduce((acc, s) => acc + (s.summary?.tokensUsed || 0), 0)
    }</td>
              <td class="text-right">$${
      scenarios.reduce((acc, s) => acc + (s.summary?.totalCost || 0), 0)
        .toFixed(6)
    }</td>
            </tr>
          </tfoot>
        </table>
      </section>
    `;

    const scenariosHtml = scenarios.map((meta) => {
      let currentStep = -1;
      const scenarioEvents = this.events.filter((e) =>
        e.scenarioId === meta.id
      );

      const eventsHtml = scenarioEvents
        .map((event, index) => {
          const title = event.metadata.description || event.type;
          const eventId = `event-${meta.id}-${index}`;
          let stepHeader = "";

          if (
            event.metadata.step !== undefined &&
            event.metadata.step !== currentStep
          ) {
            currentStep = event.metadata.step as number;
            stepHeader = `
              <div class="step-separator">
                <h2>Step ${currentStep}</h2>
                <div class="line"></div>
              </div>
            `;
          }

          let content = event.content;
          if (content.includes("%")) {
            try {
              content = decodeURIComponent(content);
            } catch {
              // If decoding fails, keep original content
            }
          }

          const eventClass = `event event-${event.type}`;
          const roleAttr = event.metadata.role_attr
            ? `data-role="${event.metadata.role_attr}"`
            : "";
          const sourceAttr = event.metadata.source
            ? `data-source="${event.metadata.source}"`
            : "";
          const stepAttr = event.metadata.step !== undefined
            ? `data-step="${event.metadata.step}"`
            : "";
          const dataAttrs =
            `id="${eventId}" data-type="${event.type}" ${roleAttr} ${sourceAttr} ${stepAttr}`;

          const iconMap: Record<string, string> = {
            message: "💬",
            interaction: "🤖",
            command: "🐚",
            evidence: "📂",
            evaluation: "⚖️",
            summary: "📊",
            tools_definition: "🛠️",
            context: "📝",
          };
          const icon = iconMap[event.type] || "🔹";

          const headerContent = `
            <span class="timestamp">${
            new Date(event.timestamp).toLocaleTimeString()
          }</span>
            <span class="type-icon">${icon}</span>
            <span class="type">${event.type}</span>
            <span class="title">${escape(String(title))}</span>
            ${
            event.metadata.step !== undefined
              ? `<span class="step-badge">Step ${event.metadata.step}</span>`
              : ""
          }
          `;

          return `
            ${stepHeader}
            <div class="${eventClass}" ${dataAttrs}>
              <div class="event-header">${headerContent}</div>
              <div class="content">${content}</div>
            </div>
          `;
        })
        .join("\n");

      const summaryHtml = meta.summary
        ? `
        <div class="summary-card">
          <div class="metric">
            <span class="metric-value" style="color: ${
          meta.summary.success ? "var(--success-color)" : "var(--error-color)"
        }">${meta.summary.success ? "PASSED" : "FAILED"}</span>
            <span class="metric-label">Result</span>
          </div>
          <div class="metric">
            <span class="metric-value">${meta.summary.errors}</span>
            <span class="metric-label">Errors</span>
          </div>
          <div class="metric">
            <span class="metric-value">${meta.summary.warnings}</span>
            <span class="metric-label">Warnings</span>
          </div>
          <div class="metric">
            <span class="metric-value">${
          (meta.summary.durationMs / 1000).toFixed(1)
        }s</span>
            <span class="metric-label">Duration</span>
          </div>
          <div class="metric">
            <span class="metric-value">${meta.summary.tokensUsed}</span>
            <span class="metric-label">Tokens</span>
          </div>
          <div class="metric">
            <span class="metric-value">$${
          meta.summary.totalCost.toFixed(6)
        }</span>
            <span class="metric-label">Cost</span>
          </div>
        </div>`
        : "";

      return `
        <article id="scenario-${meta.id}" class="scenario-section">
          <header class="scenario-header">
            <h1>Trace: ${
        escape(this.formatScenarioName(meta.id, meta.name))
      }</h1>
            <div class="meta-grid">
              <div class="meta-item"><b>ID:</b> <code>${
        escape(meta.id)
      }</code></div>
              <div class="meta-item"><b>MODEL:</b> <code>${
        escape(meta.model)
      }</code></div>
              <div class="meta-item"><b>DATE:</b> ${
        new Date(meta.date).toLocaleString()
      }</div>
              <div class="meta-item"><b>AGENT:</b> <code>${
        escape(meta.agentPath)
      }</code></div>
            </div>
          </header>

          ${summaryHtml}

          <div class="event event-context">
            <div class="event-header"><span class="title">INITIAL QUERY</span></div>
            <div class="content">
              <blockquote>${
        escape(meta.userQuery).replace(/\n/g, "<br>")
      }</blockquote>
            </div>
          </div>

          <div class="events-container">
            ${eventsHtml}
          </div>
        </article>
      `;
    }).join("\n<hr class='scenario-divider'>\n");

    // Generate ToC grouped by skills
    const groupedScenarios: Record<string, ScenarioMetadata[]> = {};
    scenarios.forEach((s) => {
      let skill = "other";
      if (s.id.startsWith("af-")) {
        const parts = s.id.split("-");
        if (parts.length >= 2) {
          skill = `af-${parts[1]}`;
        }
      }
      if (!groupedScenarios[skill]) {
        groupedScenarios[skill] = [];
      }
      groupedScenarios[skill].push(s);
    });

    const tocHtml = Object.entries(groupedScenarios)
      .map(([skill, skillScenarios]) => {
        const skillTitle = skill.toUpperCase();
        const items = skillScenarios
          .map((s) =>
            `<li><a href="#scenario-${s.id}" class="toc-scenario">${
              escape(s.name)
            }</a></li>`
          )
          .join("");
        return `
        <div class="toc-group">
          <div class="toc-group-title">${escape(skillTitle)}</div>
          <ul>${items}</ul>
        </div>
      `;
      })
      .join("\n");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Benchmark Trace</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/bash.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/json.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/markdown.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlightjs-line-numbers.js/2.8.0/highlightjs-line-numbers.min.js"></script>
  <style>
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
      --success-color: #020129;
      --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    }

    body {
      font-family: var(--font-mono);
      line-height: 1.6;
      color: var(--text-main);
      background: var(--bg-main);
      margin: 0;
      padding: 20px;
      padding-top: 80px;
      display: flex;
      justify-content: center;
    }
    .main-layout {
      display: flex;
      gap: 24px;
      width: 100%;
      max-width: 1400px;
      position: relative;
    }
    .container {
      flex: 1;
      min-width: 0;
    }
    .toc-panel {
      position: sticky;
      top: 100px;
      width: 200px;
      height: fit-content;
      max-height: calc(100vh - 140px);
      background: var(--bg-panel);
      border: 1px solid var(--border-color);
      padding: 20px;
      overflow-y: auto;
      font-size: 0.85em;
      z-index: 100;
      align-self: flex-start;
    }
    .toc-panel h3 { margin-top: 0; font-size: 1.1em; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; font-weight: bold; }
    .toc-panel ul { list-style: none; padding: 0; margin: 0; }
    .toc-panel li { margin-bottom: 10px; }
    .toc-panel a { color: var(--text-muted); text-decoration: none; display: block; }
    .toc-panel a:hover { color: var(--accent-color); text-decoration: underline; }
    .toc-panel a.toc-scenario { color: var(--text-muted); font-weight: normal; }
    .toc-group { margin-bottom: 20px; }
    .toc-group-title { font-weight: bold; color: var(--text-main); font-size: 0.9em; margin-bottom: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; }
    .toc-group ul { padding-left: 10px; }

    .dashboard {
      background: var(--bg-panel);
      border: 1px solid var(--border-color);
      padding: 32px;
      margin-bottom: 48px;
    }
    .dashboard h2 { margin-top: 0; margin-bottom: 24px; font-size: 1.5em; font-weight: bold; }
    .dashboard-table { width: 100%; border-collapse: collapse; }
    .dashboard-table th, .dashboard-table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border-color); }
    .dashboard-table th { font-size: 0.8em; color: var(--text-muted); text-transform: uppercase; }
    .text-right { text-align: right !important; }
    .total-row { font-weight: bold; background: var(--bg-main); }
    .total-row td { border-top: 2px solid var(--accent-color); }
    .status-pass { color: #2e7d32; font-weight: bold; }
    .status-fail { color: var(--error-color); font-weight: bold; }
    .status-pending { color: var(--text-muted); }

    .scenario-section { margin-bottom: 64px; }
    .scenario-header {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .scenario-divider { border: 0; height: 4px; background: var(--border-color); margin: 64px 0; }

    h1 { margin: 0; color: var(--text-main); font-size: 2.5em; font-weight: bold; letter-spacing: -1px; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-top: 20px;
      font-size: 0.9em;
      color: var(--text-muted);
    }
    .meta-item b { color: var(--text-main); }
    
    .nav-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: var(--bg-nav);
      color: var(--text-on-dark);
      padding: 12px 24px;
      z-index: 1000;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nav-links { display: flex; gap: 20px; }
    .nav-links a { color: var(--text-on-dark); text-decoration: none; font-size: 0.9em; font-weight: bold; }
    .nav-links a:hover { opacity: 0.8; }

    /* Step Grouping */
    .step-separator {
      margin-top: 48px;
      margin-bottom: 24px;
      border-bottom: 2px solid var(--accent-color);
      padding-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .step-separator h2 {
      margin: 0;
      font-size: 1.4em;
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
      margin-bottom: 16px; 
      display: flex; 
      flex-direction: column; 
    }
    .event-header {
      padding: 12px 20px;
      background: var(--bg-main);
      display: flex;
      align-items: center;
      gap: 12px;
      user-select: none;
      border-bottom: 1px solid var(--border-color);
    }
    .timestamp { color: var(--text-muted); font-size: 0.85em; }
    .type-icon { font-size: 1.2em; }
    .type {
      text-transform: uppercase;
      font-size: 0.7em;
      font-weight: bold;
      padding: 2px 8px;
      background: var(--accent-color);
      color: var(--text-on-dark);
    }
    .title { font-weight: bold; flex-grow: 1; color: var(--text-main); }
    .step-badge {
      font-size: 0.7em;
      background: var(--text-muted);
      color: var(--text-on-dark);
      padding: 2px 8px;
    }
    .content {
      padding: 20px;
    }
    
    .event-message[data-role="user"] { border-top: 4px solid var(--accent-color); }
    .event-message[data-role="assistant"] { border-top: 4px solid var(--text-muted); }
    .event-message[data-role="system"] { opacity: 0.9; }
    .event-interaction { border-top: 4px solid var(--accent-color); }
    .event-command { border-top: 4px solid var(--text-muted); }
    .event-evaluation { border-top: 4px solid var(--accent-color); }
    .event-summary { border-top: 4px solid var(--accent-color); }

    .data-block {
      position: relative;
      display: flex;
      flex-direction: column;
      margin: 12px 0;
      border: 1px solid var(--border-color);
    }
    .data-content {
      max-height: 20em;
      overflow: hidden;
      transition: max-height 0.4s ease;
      background: #fdfdfd;
    }
    .data-content.expanded {
      max-height: none;
    }
    .blur-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 80px;
      background: linear-gradient(to bottom, transparent, #fdfdfd);
      pointer-events: none;
      display: none;
      z-index: 10;
    }
    .data-block.has-overflow .data-content:not(.expanded) ~ .blur-overlay {
      display: block;
    }
    .expand-btn-container {
      display: flex;
      justify-content: center;
      margin-top: -24px;
      position: relative;
      z-index: 20;
      padding-bottom: 16px;
    }
    .expand-btn {
      background: var(--bg-nav);
      border: none;
      color: var(--text-on-dark);
      padding: 8px 20px;
      cursor: pointer;
      font-size: 0.85em;
      font-weight: bold;
      display: none;
      font-family: var(--font-mono);
      align-items: center;
      gap: 8px;
    }
    .expand-btn:hover {
      opacity: 0.9;
    }
    .expand-btn svg {
      transition: transform 0.3s ease;
    }
    .data-content.expanded ~ .expand-btn-container .expand-btn svg {
      transform: rotate(180deg);
    }
    .data-content.expanded ~ .expand-btn-container {
      margin-top: 12px;
    }
    
    pre {
      background: #f8f8f8;
      padding: 16px;
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      border: none;
    }
    code { font-family: var(--font-mono); color: var(--text-main); }
    
    /* Line numbers style */
    .hljs-ln-numbers {
      user-select: none;
      text-align: center;
      color: #ccc;
      border-right: 1px solid var(--border-color);
      vertical-align: top;
      padding-right: 12px !important;
    }
    .hljs-ln-code {
      padding-left: 12px !important;
    }

    .summary-card {
      background: var(--bg-panel);
      padding: 32px;
      display: flex;
      justify-content: space-around;
      text-align: center;
      border: 1px solid var(--border-color);
      border-top: 8px solid var(--accent-color);
      margin-bottom: 32px;
    }
    .metric-value { display: block; font-size: 2em; font-weight: bold; color: var(--text-main); }
    .metric-label { font-size: 0.8em; color: var(--text-muted); text-transform: uppercase; font-weight: bold; margin-top: 4px; }
    
    .content h3 { margin-top: 24px; margin-bottom: 12px; font-size: 1.2em; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
    .content blockquote {
      border-left: 4px solid var(--accent-color);
      margin: 0;
      padding: 12px 20px;
      background: var(--bg-main);
      color: var(--text-main);
      font-style: italic;
    }

    .back-to-top {
      position: fixed;
      bottom: 32px;
      right: 32px;
      background: var(--bg-nav);
      color: var(--text-on-dark);
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      font-weight: bold;
      z-index: 1000;
    }
    .back-to-top:hover { opacity: 0.9; }

    /* Highlight.js overrides for light theme */
    .hljs { background: transparent; color: var(--text-main); }
    .hljs-keyword { color: #0000ff; font-weight: bold; }
    .hljs-string { color: #a31515; }
    .hljs-comment { color: #008000; font-style: normal; }
    .hljs-strong { color: var(--text-main); font-weight: bold; }
    .hljs-emphasis { color: var(--text-main); }
    .hljs-section { color: var(--accent-color); font-weight: bold; }
    .hljs-link { color: #0000ee; text-decoration: underline; }
    .hljs-bullet { color: #d44950; }
    .hljs-code { color: #444; background: #f4f4f4; }
    .hljs-quote { color: var(--text-muted); }
    .hljs-attr { color: #0000ff; }
    .hljs-number { color: #098658; }
    .hljs-literal { color: #0000ff; }
    .hljs-type { color: #267f99; }
    .hljs-tag { color: #800000; }
    .hljs-name { color: #800000; }
    .hljs-title { color: #0000ff; }
  </style>
</head>
<body>
  <nav class="nav-bar">
    <div class="nav-links">
      <a href="#">TASKS.GURU BENCHMARK TRACE</a>
    </div>
  </nav>

  <div class="main-layout">
    <div class="container">
      ${dashboardHtml}
      ${scenariosHtml}
    </div>

    <aside class="toc-panel">
      <h3>SCENARIOS</h3>
      <ul>
        ${tocHtml}
      </ul>
    </aside>
  </div>

  <a href="#" class="back-to-top">↑</a>

  <script>
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
    });
  </script>
</body>
</html>`;
  }

  async init(
    scenarioName: string,
    scenarioId: string,
    model: string,
    agentPath: string,
    userQuery: string,
  ) {
    this.scenarios.set(scenarioId, {
      name: scenarioName,
      id: scenarioId,
      model: model,
      agentPath: agentPath,
      userQuery: userQuery,
      date: new Date().toISOString(),
    });
    this.currentScenarioId = scenarioId;
    await this.save();
  }

  private addEvent(
    type: string,
    metadata: Record<string, unknown>,
    content: string,
  ) {
    if (!this.currentScenarioId) return;
    this.events.push({
      type,
      timestamp: new Date().toISOString(),
      metadata,
      content,
      scenarioId: this.currentScenarioId,
    });
  }

  async logLLMInteraction(
    messages: { role: string; content: string }[],
    response: string,
    context: { step: number; source: TraceSource; model?: string },
  ) {
    for (const msg of messages) {
      const isSystem = msg.role === "system";
      const description = isSystem ? "System Prompt" : "User Message";

      const content = this.wrapCollapsible(
        `<pre><code class="language-markdown">${
          escape(msg.content)
        }</code></pre>`,
      );

      this.addEvent("message", {
        role: msg.role,
        source: isSystem
          ? "system"
          : (msg.role === "user" ? "user_emulation" : "agent"),
        step: context.step,
        description,
        role_attr: msg.role,
      }, content);
    }

    this.addEvent(
      "interaction",
      {
        source: context.source,
        step: context.step,
        model: context.model,
        description: "Model response",
      },
      this.wrapCollapsible(
        `<pre><code class="language-markdown">${escape(response)}</code></pre>`,
      ),
    );

    await this.save();
  }

  async logExecutionSection() {
    // No-op in HTML version as we use timeline
  }

  async logCommand(
    command: string,
    exitCode: number,
    stdout: string,
    stderr: string,
    context?: { step: number; script?: string },
  ) {
    let content = `<b>Command:</b> <code>${command}</code><br>`;
    if (context?.script) {
      content += `<b>Script:</b>${
        this.wrapCollapsible(
          `<pre><code class="language-bash">${context.script.trim()}</code></pre>`,
        )
      }`;
    }
    content += `<b>Exit Code:</b> ${exitCode}<br>`;
    if (stdout.trim()) {
      content += `<b>Stdout:</b>${
        this.wrapCollapsible(
          `<pre><code class="language-bash">${stdout.trim()}</code></pre>`,
        )
      }`;
    }
    if (stderr.trim()) {
      content += `<b>Stderr:</b>${
        this.wrapCollapsible(
          `<pre><code class="language-bash">${stderr.trim()}</code></pre>`,
        )
      }`;
    }

    this.addEvent("command", {
      command,
      exit_code: exitCode,
      step: context?.step,
      source: "system",
      description: command === "script_block"
        ? `Script Block (Step ${context?.step})`
        : `Command: ${command}`,
    }, content);

    await this.save();
  }

  async logEvidence(gitStatus: string, gitLog: string) {
    let content = `<h3>Git Status</h3>${
      this.wrapCollapsible(
        `<pre><code class="language-bash">${gitStatus.trim()}</code></pre>`,
      )
    }`;
    content += `<h3>Git Log</h3>${
      this.wrapCollapsible(
        `<pre><code class="language-bash">${gitLog.trim()}</code></pre>`,
      )
    }`;

    this.addEvent("evidence", {
      source: "system",
      description: "Final state of the sandbox",
    }, content);

    await this.save();
  }

  async logEvaluation(
    checklistResults: Record<string, { pass: boolean; reason?: string }>,
    checklist: { id: string; description: string; critical: boolean }[],
    judgeInteraction?: {
      messages: { role: string; content: string }[];
      response: string;
      model?: string;
    },
  ) {
    let content = "";

    if (judgeInteraction) {
      content += `<h3>Judge Interaction</h3>`;
      const judgeModel = judgeInteraction.model || "unknown";
      content +=
        `<div style="margin-bottom: 15px; font-size: 0.9em; color: var(--text-muted);"><b>Judge Model:</b> <code>${
          escape(judgeModel)
        }</code></div>`;
      for (const msg of judgeInteraction.messages) {
        const isSystem = msg.role === "system";
        const description = isSystem
          ? "Judge System Prompt"
          : "Judge Input (Evidence)";
        const msgContent = this.wrapCollapsible(
          `<pre><code class="language-markdown">${
            escape(msg.content)
          }</code></pre>`,
        );

        content +=
          `<div class="event-message" style="margin-bottom: 10px;"><b>${description}</b>${msgContent}</div>`;
      }
      content += `<h4>Judge Response</h4>${
        this.wrapCollapsible(
          `<pre><code class="language-json">${
            escape(judgeInteraction.response)
          }</code></pre>`,
        )
      }<hr>`;

      this.addEvent(
        "interaction",
        {
          source: "judge",
          description: "Judge model response",
          model: "google/gemini-2.0-flash-001", // Hardcoded as per evaluateChecklist implementation
        },
        this.wrapCollapsible(
          `<pre><code class="language-json">${
            escape(judgeInteraction.response)
          }</code></pre>`,
        ),
      );
    }

    content +=
      `<h3>Checklist Results</h3><ul style="list-style: none; padding: 0;">`;

    for (const item of checklist) {
      const res = checklistResults[item.id];
      const passed = res?.pass;
      const color = passed
        ? "var(--success-color)"
        : (item.critical ? "var(--error-color)" : "#ff9800");
      const icon = passed ? "✓" : "✗";

      content +=
        `<li style="margin-bottom: 12px; padding: 16px; background: var(--bg-main); border-left: 4px solid ${color}">
        <b style="color: ${color}">${icon} ${item.id}</b>: ${item.description}
        ${
          res?.reason
            ? this.wrapCollapsible(
              `<i style="font-size: 0.9em; color: var(--text-muted);">Reason: ${res.reason}</i>`,
              "margin-top: 12px;",
            )
            : ""
        }
      </li>`;
    }
    content += `</ul>`;

    this.addEvent("evaluation", {
      source: "judge",
      description: "Judge's checklist results",
    }, content);

    await this.save();
  }

  async logSummary(
    result: {
      success: boolean;
      score: number;
      durationMs: number;
      tokensUsed: number;
      totalCost: number;
      errors: number;
      warnings: number;
    },
  ) {
    if (this.currentScenarioId) {
      const scenario = this.scenarios.get(this.currentScenarioId);
      if (scenario) {
        scenario.summary = result;
      }
    }

    const statusColor = result.success
      ? "var(--success-color)"
      : "var(--error-color)";
    const content = `
      <div class="summary-card">
        <div class="metric">
          <span class="metric-value" style="color: ${statusColor}">${
      result.success ? "PASSED" : "FAILED"
    }</span>
          <span class="metric-label">Result</span>
        </div>
        <div class="metric">
          <span class="metric-value">${result.errors}</span>
          <span class="metric-label">Errors</span>
        </div>
        <div class="metric">
          <span class="metric-value">${result.warnings}</span>
          <span class="metric-label">Warnings</span>
        </div>
        <div class="metric">
          <span class="metric-value">${
      (result.durationMs / 1000).toFixed(1)
    }s</span>
          <span class="metric-label">Duration</span>
        </div>
        <div class="metric">
          <span class="metric-value">${result.tokensUsed}</span>
          <span class="metric-label">Tokens</span>
        </div>
      </div>
    `;

    this.addEvent("summary", {
      source: "system",
      success: result.success,
      score: result.score,
      duration_ms: result.durationMs,
      tokens: result.tokensUsed,
      description: "Execution Summary",
    }, content);

    await this.save();
  }

  async logTools(toolsDescription: string) {
    this.addEvent(
      "tools_definition",
      {
        source: "system",
        description: "Available tools",
      },
      this.wrapCollapsible(
        `<pre><code class="language-json">${toolsDescription}</code></pre>`,
      ),
    );

    await this.save();
  }

  async logSystemPrompt(content: string) {
    this.addEvent(
      "message",
      {
        role: "system",
        source: "system",
        description: "Assembled System Prompt",
        role_attr: "system",
      },
      this.wrapCollapsible(
        `<pre><code class="language-markdown">${escape(content)}</code></pre>`,
      ),
    );
    await this.save();
  }
}

// Simple HTML escaping helper for use outside the class if needed
function escape(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
