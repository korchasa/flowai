/**
 * trace-renderer.ts — Renders HTML report from collected trace data.
 * Pure functions: takes data, returns HTML strings. No I/O.
 */

import type {
  ScenarioGroupStats,
  ScenarioMetadata,
  TraceEvent,
} from "./trace-types.ts";
import { escape } from "./trace-types.ts";
import { getCSS, getJS } from "./trace-styles.ts";

/** Formats scenario name with skill prefix for display. */
function formatScenarioName(id: string, name: string): string {
  if (id.startsWith("flowai-")) {
    const parts = id.split("-");
    if (parts.length >= 2) {
      const skill = `flowai-${parts[1]}`;
      return `${skill}: ${name}`;
    }
  }
  return name;
}

/** Renders the overview dashboard section with summary metrics and scenario table. */
function renderDashboard(
  groups: ScenarioGroupStats[],
  scenarios: ScenarioMetadata[],
): string {
  return `
      <section id="overview" class="scenario-section active">
        <h2>BENCHMARK DASHBOARD</h2>

        <div class="summary-card global-summary">
          <div class="metric">
            <span class="metric-value" style="color: ${
    groups.every((g) => g.allPassed)
      ? "var(--success-color)"
      : "var(--error-color)"
  }">${groups.filter((g) => g.allPassed).length}/${groups.length}</span>
            <span class="metric-label">Passed Scenarios</span>
          </div>
          <div class="metric">
            <span class="metric-value">${
    groups.length > 0
      ? (groups.reduce((a, g) => a + g.avgScore, 0) / groups.length).toFixed(
        1,
      )
      : "0.0"
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
    groups.reduce((a, g) => a + g.totalCost, 0).toFixed(4)
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
            ${renderDashboardRows(groups)}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td>TOTAL</td>
              <td class="text-right">${
    groups.every((g) => g.allPassed) ? "PASSED" : "FAILED"
  }</td>
              <td class="text-right">${
    groups.length > 0
      ? (groups.reduce((a, g) => a + g.avgScore, 0) / groups.length).toFixed(
        1,
      )
      : "0.0"
  }%</td>
              <td class="text-right">${
    groups.reduce((a, g) => a + g.totalErrors, 0)
  }/${groups.reduce((a, g) => a + g.totalWarnings, 0)}</td>
              <td class="text-right">${
    (scenarios.reduce((acc, s) => acc + (s.summary?.durationMs || 0), 0) /
      1000).toFixed(1)
  }s</td>
              <td class="text-right">${
    groups.reduce((a, g) => a + g.totalTokens, 0)
  }</td>
              <td class="text-right">$${
    groups.reduce((a, g) => a + g.totalCost, 0).toFixed(6)
  }</td>
            </tr>
          </tfoot>
        </table>
      </section>
    `;
}

/** Renders table body rows for the dashboard (group rows + optional run sub-rows). */
function renderDashboardRows(groups: ScenarioGroupStats[]): string {
  return groups.map((g) => {
    const isMultiRun = g.runs.length > 1;
    const statusClass = g.allPassed ? "status-pass" : "status-fail";
    const statusText = isMultiRun
      ? `${g.passRate.toFixed(0)}% (${
        g.runs.filter((r) => r.summary?.success).length
      }/${g.runs.length})`
      : (g.allPassed ? "PASSED" : "FAILED");

    const groupRow = `
                <tr class="group-row" onclick="${
      isMultiRun
        ? `toggleRunGroup('${g.groupId}')`
        : `showScenario('${g.runs[0].id}')`
    }" style="cursor: pointer">
                  <td>${isMultiRun ? "&#9654; " : ""}${
      escape(formatScenarioName(g.groupId, g.name))
    }</td>
                  <td class="${statusClass} text-right">${statusText}</td>
                  <td class="text-right">${g.avgScore.toFixed(1)}%</td>
                  <td class="text-right">${g.totalErrors}/${g.totalWarnings}</td>
                  <td class="text-right">${
      isMultiRun
        ? (g.avgDurationMs / 1000).toFixed(1) + "s avg"
        : (g.avgDurationMs / 1000).toFixed(1) + "s"
    }</td>
                  <td class="text-right">${g.totalTokens}</td>
                  <td class="text-right">$${g.totalCost.toFixed(6)}</td>
                </tr>`;

    if (!isMultiRun) return groupRow;

    const runRows = g.runs.map((s) => {
      const runStatusClass = s.summary
        ? (s.summary.success ? "status-pass" : "status-fail")
        : "status-pending";
      const runStatusText = s.summary
        ? (s.summary.success ? "PASSED" : "FAILED")
        : "PENDING";
      return `
                <tr class="run-row run-group-${g.groupId}" style="display: none; cursor: pointer" onclick="showScenario('${s.id}')">
                  <td style="padding-left: 32px">run-${s.runIndex || "?"}</td>
                  <td class="${runStatusClass} text-right">${runStatusText}</td>
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
                </tr>`;
    }).join("");

    return groupRow + runRows;
  }).join("");
}

/** Renders a single scenario detail view (header, summary, events timeline). */
function renderScenarioDetail(
  meta: ScenarioMetadata,
  events: TraceEvent[],
): string {
  let currentStep = -1;
  const scenarioEvents = events.filter((e) => e.scenarioId === meta.id);

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
      message: "\u{1F4AC}",
      interaction: "\u{1F916}",
      command: "\u{1F41A}",
      evidence: "\u{1F4C2}",
      evaluation: "\u2696\uFE0F",
      summary: "\u{1F4CA}",
      tools_definition: "\u{1F6E0}\uFE0F",
      context: "\u{1F4DD}",
    };
    const icon = iconMap[event.type] || "\u{1F539}";

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
              <h1>Trace: ${escape(formatScenarioName(meta.id, meta.name))}</h1>
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
              ${
    meta.scenarioGroup
      ? `<div class="meta-item"><b>SANDBOX:</b> <a href="./${meta.scenarioGroup}/run-${meta.runIndex}/sandbox/">.../sandbox/</a></div>`
      : ""
  }
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
}

/** Renders the sidebar table of contents, grouped by skill. */
function renderToC(groups: ScenarioGroupStats[]): string {
  const groupedBySkill: Record<string, ScenarioGroupStats[]> = {};
  for (const g of groups) {
    let skill = "other";
    if (g.groupId.startsWith("flowai-")) {
      const parts = g.groupId.split("-");
      if (parts.length >= 2) {
        skill = `flowai-${parts[1]}`;
      }
    }
    if (!groupedBySkill[skill]) {
      groupedBySkill[skill] = [];
    }
    groupedBySkill[skill].push(g);
  }

  return Object.entries(groupedBySkill)
    .map(([skill, skillGroups]) => {
      const skillTitle = skill.toUpperCase();
      const items = skillGroups
        .map((g) => {
          if (g.runs.length === 1) {
            const s = g.runs[0];
            const statusClass = s.summary
              ? (s.summary.success ? "status-pass" : "status-fail")
              : "status-pending";
            const statusIcon = s.summary
              ? (s.summary.success ? "\u2713" : "\u2717")
              : "\u25CB";
            return `<li data-id="${s.id}" onclick="showScenario('${s.id}')">
                <span class="toc-status ${statusClass}">${statusIcon}</span>
                <span class="toc-scenario">${escape(s.name)}</span>
              </li>`;
          }

          // Multi-run group
          const groupStatusClass = g.allPassed ? "status-pass" : "status-fail";
          const groupStatusIcon = g.allPassed ? "\u2713" : "\u2717";
          const subItems = g.runs.map((s) => {
            const sc = s.summary
              ? (s.summary.success ? "status-pass" : "status-fail")
              : "status-pending";
            const si = s.summary
              ? (s.summary.success ? "\u2713" : "\u2717")
              : "\u25CB";
            return `<li data-id="${s.id}" onclick="showScenario('${s.id}')" style="padding-left: 24px; font-size: 0.8em;">
                <span class="toc-status ${sc}">${si}</span>
                <span class="toc-scenario">run-${s.runIndex || "?"}</span>
              </li>`;
          }).join("");

          return `<li class="toc-group-item" onclick="toggleRunGroup('${g.groupId}')">
              <span class="toc-status ${groupStatusClass}">${groupStatusIcon}</span>
              <span class="toc-scenario">${
            escape(g.name)
          } (${g.runs.length} runs)</span>
            </li>
            ${subItems}`;
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
}

/** Assembles the full HTML report from sub-components. */
export function renderTraceReport(
  scenarios: ScenarioMetadata[],
  events: TraceEvent[],
  groups: ScenarioGroupStats[],
): string {
  const dashboardHtml = renderDashboard(groups, scenarios);
  const scenariosHtml = scenarios.map((meta) =>
    renderScenarioDetail(meta, events)
  ).join("\n");
  const tocHtml = renderToC(groups);

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
  <style>${getCSS()}</style>
</head>
<body>
  <nav class="nav-bar">
    <div class="nav-links">
      <a href="#" onclick="showScenario('overview'); return false;">FLOWAI BENCHMARK TRACE</a>
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

  <script>${getJS()}</script>
</body>
</html>`;
}
