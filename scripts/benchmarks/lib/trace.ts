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
      <section id="overview" class="scenario-section active">
        <h2>BENCHMARK DASHBOARD</h2>
        
        <div class="summary-card global-summary">
          <div class="metric">
            <span class="metric-value" style="color: ${
      scenarios.every((s) => s.summary?.success)
        ? "var(--success-color)"
        : "var(--error-color)"
    }">${
      scenarios.filter((s) => s.summary?.success).length
    }/${scenarios.length}</span>
            <span class="metric-label">Passed Scenarios</span>
          </div>
          <div class="metric">
            <span class="metric-value">${
      (scenarios.reduce((acc, s) => acc + (s.summary?.score || 0), 0) /
        scenarios.length).toFixed(1)
    }%</span>
            <span class="metric-label">Avg Score</span>
          </div>
          <div class="metric">
            <span class="metric-value">${
      (scenarios.reduce((acc, s) => acc + (s.summary?.durationMs || 0), 0) /
        1000).toFixed(1)
    }s</span>
            <span class="metric-label">Total Duration</span>
          </div>
          <div class="metric">
            <span class="metric-value">$${
      scenarios.reduce((acc, s) => acc + (s.summary?.totalCost || 0), 0)
        .toFixed(4)
    }</span>
            <span class="metric-label">Total Cost</span>
          </div>
        </div>

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
                <tr onclick="showScenario('${s.id}')" style="cursor: pointer">
                  <td>${escape(this.formatScenarioName(s.id, s.name))}</td>
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

      const eventsHtml: string[] = [];
      let currentInteractionId: string | null = null;
      let interactionGroup: string[] = [];

      const flushInteraction = () => {
        if (interactionGroup.length > 0) {
          eventsHtml.push(
            `<div class="event-group">${interactionGroup.join("")}</div>`,
          );
          interactionGroup = [];
        }
      };

      scenarioEvents.forEach((event, index) => {
        const title = event.metadata.description || event.type;
        const eventId = `event-${meta.id}-${index}`;
        let stepHeader = "";

        if (
          event.metadata.step !== undefined &&
          event.metadata.step !== currentStep
        ) {
          flushInteraction();
          currentStep = event.metadata.step as number;
          stepHeader = `
                <div class="step-separator">
                  <h2>Step ${currentStep}</h2>
                  <div class="line"></div>
                </div>
              `;
          eventsHtml.push(stepHeader);
        }

        const interactionId = event.metadata.interactionId as string | null;
        if (interactionId !== currentInteractionId) {
          flushInteraction();
          currentInteractionId = interactionId;
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

        const eventHtml = `
              <div class="${eventClass}" ${dataAttrs}>
                <div class="event-header">${headerContent}</div>
                <div class="content">${content}</div>
              </div>
            `;

        if (interactionId) {
          interactionGroup.push(eventHtml);
        } else {
          eventsHtml.push(eventHtml);
        }
      });

      flushInteraction();

      const finalEventsHtml = eventsHtml.join("\n");

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
            <div class="scenario-title-row">
              <h1>Trace: ${
        escape(this.formatScenarioName(meta.id, meta.name))
      }</h1>
              <div class="header-actions">
                <!-- Actions removed as clipping is gone -->
              </div>
            </div>
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
            ${finalEventsHtml}
          </div>
        </article>
      `;
    }).join("\n");

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
          .map((s) => {
            const statusClass = s.summary
              ? (s.summary.success ? "status-pass" : "status-fail")
              : "status-pending";
            const statusIcon = s.summary
              ? (s.summary.success ? "✓" : "✗")
              : "○";
            return `<li data-id="${s.id}" onclick="showScenario('${s.id}')">
              <span class="toc-status ${statusClass}">${statusIcon}</span>
              <span class="toc-scenario">${escape(s.name)}</span>
            </li>`;
          })
          .join("");
        return `
        <div class="toc-group" data-skill="${escape(skill)}">
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
  </style>
</head>
<body>
  <nav class="nav-bar">
    <div class="nav-links">
      <a href="#" onclick="showScenario('overview'); return false;">TASKS.GURU BENCHMARK TRACE</a>
    </div>
  </nav>

  <div class="main-layout">
    <aside class="toc-panel">
      <div class="toc-header">
        <h3 onclick="showScenario('overview')">OVERVIEW</h3>
        <input type="text" class="toc-search" placeholder="Search scenarios..." oninput="filterScenarios(this.value)">
      </div>
      <div class="toc-content">
        ${tocHtml}
      </div>
    </aside>

    <div class="scenarios-container">
      ${dashboardHtml}
      ${scenariosHtml}
    </div>
  </div>

  <script>
    function showScenario(id) {
      // Update active state in sidebar
      document.querySelectorAll('.toc-panel li').forEach(li => {
        li.classList.toggle('active', li.getAttribute('data-id') === id);
      });

      // Update active scenario in main container
      document.querySelectorAll('.scenario-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === (id === 'overview' ? 'overview' : 'scenario-' + id));
      });

      // Scroll to top of container
      document.querySelector('.scenarios-container').scrollTop = 0;

      // Update hash without scrolling
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

      // Handle initial hash
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
    const interactionId = crypto.randomUUID();
    for (const msg of messages) {
      const isSystem = msg.role === "system";
      const description = isSystem ? "System Prompt" : "User Message";

      const content = `<pre><code class="language-markdown">${
        escape(msg.content)
      }</code></pre>`;

      this.addEvent("message", {
        role: msg.role,
        source: isSystem
          ? "system"
          : (msg.role === "user" ? "user_emulation" : "agent"),
        step: context.step,
        description,
        role_attr: msg.role,
        interactionId,
      }, content);
    }

    this.addEvent(
      "interaction",
      {
        source: context.source,
        step: context.step,
        model: context.model,
        description: "Model response",
        interactionId,
      },
      `<pre><code class="language-markdown">${escape(response)}</code></pre>`,
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
      content +=
        `<b>Script:</b><pre><code class="language-bash">${context.script.trim()}</code></pre>`;
    }
    content += `<b>Exit Code:</b> ${exitCode}<br>`;
    if (stdout.trim()) {
      content +=
        `<b>Stdout:</b><pre><code class="language-bash">${stdout.trim()}</code></pre>`;
    }
    if (stderr.trim()) {
      content +=
        `<b>Stderr:</b><pre><code class="language-bash">${stderr.trim()}</code></pre>`;
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
    let content =
      `<h3>Git Status</h3><pre><code class="language-bash">${gitStatus.trim()}</code></pre>`;
    content +=
      `<h3>Git Log</h3><pre><code class="language-bash">${gitLog.trim()}</code></pre>`;

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
        const msgContent = `<pre><code class="language-markdown">${
          escape(msg.content)
        }</code></pre>`;

        content +=
          `<div class="event-message" style="margin-bottom: 10px;"><b>${description}</b>${msgContent}</div>`;
      }
      content += `<h4>Judge Response</h4><pre><code class="language-json">${
        escape(judgeInteraction.response)
      }</code></pre><hr>`;

      this.addEvent(
        "interaction",
        {
          source: "judge",
          description: "Judge model response",
          model: "google/gemini-2.0-flash-001", // Hardcoded as per evaluateChecklist implementation
        },
        `<pre><code class="language-json">${
          escape(judgeInteraction.response)
        }</code></pre>`,
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
            ? `<div style="margin-top: 12px;"><i style="font-size: 0.9em; color: var(--text-muted);">Reason: ${res.reason}</i></div>`
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
