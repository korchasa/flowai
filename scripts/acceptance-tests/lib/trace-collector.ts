/**
 * trace-collector.ts — Data collection and aggregation for benchmark traces.
 * No I/O, no file writes. Stores events and scenario metadata in memory.
 */

import type {
  ScenarioGroupStats,
  ScenarioMetadata,
  TraceEvent,
  TraceSource,
} from "./trace-types.ts";
import { escape } from "./trace-types.ts";

export class TraceCollector {
  private events: TraceEvent[] = [];
  private scenarios: Map<string, ScenarioMetadata> = new Map();

  getScenarios(): ScenarioMetadata[] {
    return Array.from(this.scenarios.values());
  }

  getEvents(): TraceEvent[] {
    return [...this.events];
  }

  getEventsForScenario(id: string): TraceEvent[] {
    return this.events.filter((e) => e.scenarioId === id);
  }

  hasScenarios(): boolean {
    return this.scenarios.size > 0;
  }

  /** Groups scenarios by scenarioGroup (or id) and computes aggregate stats. */
  computeGroups(): ScenarioGroupStats[] {
    const scenarios = Array.from(this.scenarios.values());
    const groupMap = new Map<string, ScenarioMetadata[]>();
    for (const s of scenarios) {
      const groupId = s.scenarioGroup || s.id;
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, []);
      }
      groupMap.get(groupId)!.push(s);
    }

    return Array.from(groupMap.entries()).map(
      ([groupId, runs]) => {
        const withSummary = runs.filter((r) => r.summary);
        const passedCount = withSummary.filter((r) => r.summary?.success)
          .length;
        const totalRuns = runs.length;
        return {
          groupId,
          name: runs[0].name,
          runs,
          passRate: totalRuns > 0 ? (passedCount / totalRuns) * 100 : 0,
          avgScore: withSummary.length > 0
            ? withSummary.reduce((a, r) => a + (r.summary?.score || 0), 0) /
              withSummary.length
            : 0,
          avgDurationMs: withSummary.length > 0
            ? withSummary.reduce(
              (a, r) => a + (r.summary?.durationMs || 0),
              0,
            ) / withSummary.length
            : 0,
          totalTokens: withSummary.reduce(
            (a, r) => a + (r.summary?.tokensUsed || 0),
            0,
          ),
          totalCost: withSummary.reduce(
            (a, r) => a + (r.summary?.totalCost || 0),
            0,
          ),
          totalErrors: withSummary.reduce(
            (a, r) => a + (r.summary?.errors || 0),
            0,
          ),
          totalWarnings: withSummary.reduce(
            (a, r) => a + (r.summary?.warnings || 0),
            0,
          ),
          allPassed: withSummary.length > 0 &&
            withSummary.every((r) => r.summary?.success),
        };
      },
    );
  }

  /** Wraps content in a collapsible data-block container. */
  wrapCollapsible(content: string, style = ""): string {
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

  /** Appends a trace event for the given scenario. */
  private addEvent(
    scenarioId: string,
    type: string,
    metadata: Record<string, unknown>,
    content: string,
  ) {
    this.events.push({
      type,
      timestamp: new Date().toISOString(),
      metadata,
      content,
      scenarioId,
    });
  }

  /** Initializes a new scenario in the trace. */
  init(
    scenarioName: string,
    scenarioId: string,
    model: string,
    agentPath: string,
    userQuery: string,
    scenarioGroup?: string,
  ) {
    const runIndex = scenarioGroup
      ? parseInt(scenarioId.split("/run-").pop() || "1")
      : undefined;
    this.scenarios.set(scenarioId, {
      name: scenarioName,
      id: scenarioId,
      model: model,
      agentPath: agentPath,
      userQuery: userQuery,
      date: new Date().toISOString(),
      scenarioGroup,
      runIndex,
    });
  }

  /** Logs an LLM interaction (messages + response) with trace events. */
  logLLMInteraction(
    scenarioId: string,
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

      this.addEvent(scenarioId, "message", {
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
      scenarioId,
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
  }

  logExecutionSection() {
    // No-op in HTML version as we use timeline
  }

  /** Logs a command execution with output. */
  logCommand(
    scenarioId: string,
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

    this.addEvent(scenarioId, "command", {
      command,
      exit_code: exitCode,
      step: context?.step,
      source: "system",
      description: command === "script_block"
        ? `Script Block (Step ${context?.step})`
        : `Command: ${command}`,
    }, content);
  }

  /** Logs git evidence (status + log) for the sandbox. */
  logEvidence(scenarioId: string, gitStatus: string, gitLog: string) {
    let content =
      `<h3>Git Status</h3><pre><code class="language-bash">${gitStatus.trim()}</code></pre>`;
    content +=
      `<h3>Git Log</h3><pre><code class="language-bash">${gitLog.trim()}</code></pre>`;

    this.addEvent(scenarioId, "evidence", {
      source: "system",
      description: "Final state of the sandbox",
    }, content);
  }

  /** Logs the LLM Judge evaluation results (checklist + optional judge interaction). */
  logEvaluation(
    scenarioId: string,
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
        scenarioId,
        "interaction",
        {
          source: "judge",
          description: "Judge model response",
          model: judgeInteraction.model || "unknown",
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
      const icon = passed ? "\u2713" : "\u2717";

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

    this.addEvent(scenarioId, "evaluation", {
      source: "judge",
      description: "Judge's checklist results",
    }, content);
  }

  /** Logs the execution summary for a scenario. */
  logSummary(
    scenarioId: string,
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
    const scenario = this.scenarios.get(scenarioId);
    if (scenario) {
      scenario.summary = result;
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

    this.addEvent(scenarioId, "summary", {
      source: "system",
      success: result.success,
      score: result.score,
      duration_ms: result.durationMs,
      tokens: result.tokensUsed,
      description: "Execution Summary",
    }, content);
  }

  /** Logs available tools definition. */
  logTools(scenarioId: string, toolsDescription: string) {
    this.addEvent(
      scenarioId,
      "tools_definition",
      {
        source: "system",
        description: "Available tools",
      },
      this.wrapCollapsible(
        `<pre><code class="language-json">${toolsDescription}</code></pre>`,
      ),
    );
  }
}
