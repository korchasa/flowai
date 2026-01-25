import { join } from "@std/path";

export type TraceSource = "agent" | "judge" | "user_emulation" | "system";

export interface TraceEvent {
  type: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  content: string;
}

export class TraceLogger {
  private tracePath: string;
  private events: TraceEvent[] = [];
  private scenarioMetadata: {
    name: string;
    id: string;
    model: string;
    agentPath: string;
    userQuery: string;
    date: string;
  } | null = null;

  constructor(workDir: string) {
    this.tracePath = join(workDir, "trace.html");
  }

  private async save() {
    if (!this.scenarioMetadata) return;

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
            <span>Show More</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  private render(): string {
    const meta = this.scenarioMetadata!;

    // Simple HTML escaping
    const escape = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    let currentStep = -1;
    const eventsHtml = this.events
      .map((event, index) => {
        const title = event.metadata.description || event.type;
        const eventId = `event-${index}`;
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

    // Generate ToC
    const tocItems: string[] = [];
    let lastStep = -1;

    this.events.forEach((event, index) => {
      if (
        event.metadata.step !== undefined && event.metadata.step !== lastStep
      ) {
        lastStep = event.metadata.step as number;
        tocItems.push(
          `<li><a href="#event-${index}">Step ${lastStep}</a></li>`,
        );
      }
      if (event.type === "evaluation") {
        tocItems.push(
          `<li><a href="#event-${index}" class="toc-eval">Judge Eval</a></li>`,
        );
      }
      if (event.type === "summary") {
        tocItems.push(
          `<li><a href="#event-${index}" class="toc-summary">Summary</a></li>`,
        );
      }
    });

    const tocHtml = tocItems.join("\n");

    const summaryEvent = this.events.find((e) => e.type === "summary");
    const summaryHtml = summaryEvent
      ? `<div class="top-summary" id="summary-section">${summaryEvent.content}</div>`
      : "";

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Benchmark Trace: ${escape(meta.name)}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/bash.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/json.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/markdown.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlightjs-line-numbers.js/2.8.0/highlightjs-line-numbers.min.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #e1e1e1;
      background: #1e1e1e;
      margin: 0;
      padding: 20px;
      padding-top: 60px;
      display: flex;
      justify-content: center;
    }
    .main-layout {
      display: flex;
      gap: 20px;
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
      top: 80px;
      width: 180px;
      height: fit-content;
      max-height: calc(100vh - 120px);
      background: #252526;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 15px;
      overflow-y: auto;
      font-size: 0.85em;
      z-index: 100;
      align-self: flex-start;
    }
    .toc-panel h3 { margin-top: 0; font-size: 1em; border-bottom: 1px solid #444; padding-bottom: 8px; }
    .toc-panel ul { list-style: none; padding: 0; margin: 0; }
    .toc-panel li { margin-bottom: 8px; }
    .toc-panel a { color: #aaa; text-decoration: none; display: block; }
    .toc-panel a:hover { color: #007acc; }
    .toc-panel a.toc-eval { color: #c586c0; font-weight: bold; margin-top: 10px; border-top: 1px solid #444; padding-top: 8px; }
    .toc-panel a.toc-summary { color: #6a9955; font-weight: bold; }

    header {
      border-bottom: 1px solid #333;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    h1 { margin: 0; color: #fff; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      margin-top: 15px;
      font-size: 0.9em;
      color: #aaa;
    }
    .meta-item b { color: #ddd; }
    
    .nav-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #2d2d2d;
      border-bottom: 1px solid #444;
      padding: 10px 20px;
      z-index: 1000;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    }
    .nav-links { display: flex; gap: 15px; }
    .nav-links a { color: #aaa; text-decoration: none; font-size: 0.9em; }
    .nav-links a:hover { color: #fff; }
    .filters { display: flex; gap: 10px; align-items: center; }
    .filter-btn {
      background: #444;
      border: none;
      color: #ccc;
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.8em;
    }
    .filter-btn.active { background: #007acc; color: #fff; }

    /* Step Grouping */
    .step-separator {
      margin-top: 40px;
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .step-separator h2 {
      margin: 0;
      font-size: 1.2em;
      color: #007acc;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .step-separator .line {
      flex-grow: 1;
      height: 1px;
      background: #333;
    }

    /* Event Colors & Variables */
    .event { --bg: #252526; background: var(--bg); border: 1px solid #333; border-radius: 4px; margin-bottom: 10px; overflow: hidden; display: flex; flex-direction: column; }
    .event-message[data-role="user"] { --bg: #1e2a35; border-left: 4px solid #007acc; }
    .event-message[data-role="assistant"] { --bg: #2d2d2d; border-left: 4px solid #ce9178; }
    .event-message[data-role="system"] { --bg: #252526; border-left: 4px solid #444; opacity: 0.8; }
    .event-interaction { --bg: #1e2e2a; border-left: 4px solid #4ec9b0; }
    .event-command { --bg: #2d2d25; border-left: 4px solid #dcdcaa; }
    .event-evaluation { --bg: #2d252d; border-left: 4px solid #c586c0; }
    .event-summary { --bg: #252d25; border-left: 4px solid #6a9955; }
    .event-evidence { --bg: #1e2d35; border-left: 4px solid #9cdcfe; }
    .event-tools_definition { --bg: #252526; border-left: 4px solid #569cd6; opacity: 0.8; }

    .event-header {
      padding: 8px 15px;
      background: rgba(255,255,255,0.05);
      display: flex;
      align-items: center;
      gap: 10px;
      user-select: none;
    }
    .timestamp { color: #888; font-family: monospace; font-size: 0.85em; }
    .type-icon { font-size: 1.2em; }
    .type {
      text-transform: uppercase;
      font-size: 0.7em;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 3px;
      background: rgba(255,255,255,0.1);
      color: #eee;
    }
    .title { font-weight: 500; flex-grow: 1; }
    .step-badge {
      font-size: 0.7em;
      background: #007acc;
      color: #fff;
      padding: 2px 6px;
      border-radius: 10px;
    }
    .content {
      padding: 15px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .data-block {
      position: relative;
      display: flex;
      flex-direction: column;
      margin: 8px 0;
    }
    .data-content {
      max-height: 15.5em; /* Approx 10 lines */
      overflow: hidden;
      transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .data-content.expanded {
      max-height: none;
    }
    .blur-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: linear-gradient(to bottom, transparent, var(--bg));
      pointer-events: none;
      display: none;
      z-index: 10;
    }
    .data-block.has-overflow .data-content:not(.expanded) + .blur-overlay {
      display: block;
    }
    .expand-btn-container {
      display: flex;
      justify-content: center;
      margin-top: -20px;
      position: relative;
      z-index: 20;
      padding-bottom: 10px;
    }
    .expand-btn {
      background: #444;
      border: 1px solid #555;
      color: #eee;
      padding: 6px 16px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 0.85em;
      font-weight: 500;
      display: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
      align-items: center;
      gap: 6px;
    }
    .expand-btn:hover {
      background: #555;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.4);
      color: #fff;
    }
    .expand-btn svg {
      transition: transform 0.3s ease;
    }
    .data-content.expanded ~ .expand-btn-container .expand-btn svg {
      transform: rotate(180deg);
    }
    .data-content.expanded ~ .expand-btn-container {
      margin-top: 10px;
    }
    
    pre {
      background: rgba(0,0,0,0.3);
      padding: 10px;
      border-radius: 4px;
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
    
    /* Line numbers style */
    .hljs-ln-numbers {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      text-align: center;
      color: #555;
      border-right: 1px solid #333;
      vertical-align: top;
      padding-right: 10px !important;
    }
    .hljs-ln-code {
      padding-left: 10px !important;
    }

    .top-summary { margin-bottom: 20px; }
    .summary-card {
      background: #2d3d2d;
      padding: 20px;
      border-radius: 8px;
      display: flex;
      justify-content: space-around;
      text-align: center;
      border: 1px solid #6a9955;
    }
    .metric-value { display: block; font-size: 1.5em; font-weight: bold; color: #fff; }
    .metric-label { font-size: 0.8em; color: #aaa; text-transform: uppercase; }
    
    /* Markdown-like styles for content */
    .content h2, .content h3 { margin-top: 0; }
    .content blockquote {
      border-left: 4px solid #444;
      margin: 0;
      padding-left: 15px;
      color: #aaa;
    }

    .back-to-top {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #007acc;
      color: #fff;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
      font-weight: bold;
      opacity: 0.7;
    }
    .back-to-top:hover { opacity: 1; }
  </style>
</head>
<body>
  <nav class="nav-bar">
    <div class="nav-links">
      <a href="#">Top</a>
      <a href="#events">Events</a>
      <a href="#evaluation">Evaluation</a>
    </div>
    <div class="filters">
      <span style="font-size: 0.8em; color: #888;">Filter:</span>
      <button class="filter-btn active" onclick="filterEvents('all')">All</button>
      <button class="filter-btn" onclick="filterEvents('message')">Messages</button>
      <button class="filter-btn" onclick="filterEvents('command')">Commands</button>
      <button class="filter-btn" onclick="filterEvents('interaction')">Model</button>
      <button class="filter-btn" onclick="filterEvents('evaluation')">Eval</button>
    </div>
  </nav>

  <div class="main-layout">
    <div class="container">
      <header>
        <h1>Benchmark Trace: ${escape(meta.name)}</h1>
        <div class="meta-grid">
          <div class="meta-item"><b>ID:</b> <code>${
      escape(meta.id)
    }</code></div>
          <div class="meta-item"><b>Model:</b> <code>${
      escape(meta.model)
    }</code></div>
          <div class="meta-item"><b>Date:</b> ${
      new Date(meta.date).toLocaleString()
    }</div>
          <div class="meta-item"><b>Agent:</b> <code>${
      escape(meta.agentPath)
    }</code></div>
        </div>
      </header>

      ${summaryHtml}

      <div class="event event-context">
        <div class="event-header"><span class="title">Initial Query</span></div>
        <div class="content">
          <blockquote>${
      escape(meta.userQuery).replace(/\n/g, "<br>")
    }</blockquote>
        </div>
      </div>

      <div id="events">
        ${eventsHtml}
      </div>
    </div>

    <aside class="toc-panel">
      <h3>Timeline</h3>
      <ul>
        ${tocHtml}
      </ul>
    </aside>
  </div>

  <a href="#" class="back-to-top">↑</a>

  <script>
    function filterEvents(type) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      
      document.querySelectorAll('.event').forEach(el => {
        if (type === 'all' || el.getAttribute('data-type') === type || el.classList.contains('event-context')) {
          el.style.display = 'block';
        } else {
          el.style.display = 'none';
        }
      });
    }

    function toggleExpand(btn) {
      const container = btn.closest('.data-block');
      const inner = container.querySelector('.data-content');
      inner.classList.toggle('expanded');
      const label = btn.querySelector('span');
      label.textContent = inner.classList.contains('expanded') ? 'Show Less' : 'Show More';
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
    this.scenarioMetadata = {
      name: scenarioName,
      id: scenarioId,
      model: model,
      agentPath: agentPath,
      userQuery: userQuery,
      date: new Date().toISOString(),
    };
    await this.save();
  }

  private addEvent(
    type: string,
    metadata: Record<string, unknown>,
    content: string,
  ) {
    this.events.push({
      type,
      timestamp: new Date().toISOString(),
      metadata,
      content,
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
    },
  ) {
    let content = "";

    if (judgeInteraction) {
      content += `<h3>Judge Interaction</h3>`;
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
        ? "#6a9955"
        : (item.critical ? "#f44336" : "#ff9800");
      const icon = passed ? "✓" : "✗";

      content +=
        `<li style="margin-bottom: 10px; padding: 10px; border-radius: 4px; background: #2d2d2d; border-left: 4px solid ${color}">
        <b style="color: ${color}">${icon} ${item.id}</b>: ${item.description}
        ${
          res?.reason
            ? this.wrapCollapsible(
              `<i style="font-size: 0.9em; color: #aaa;">Reason: ${res.reason}</i>`,
              "margin-top: 8px;",
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
      errors: number;
      warnings: number;
    },
  ) {
    const statusColor = result.success ? "#6a9955" : "#f44336";
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
