import { join } from "@std/path";
import { BenchmarkChecklistItem } from "./types.ts";

export class TraceLogger {
  private tracePath: string;

  constructor(workDir: string) {
    this.tracePath = join(workDir, "trace.md");
  }

  async init(
    scenarioName: string,
    scenarioId: string,
    model: string,
    agentPath: string,
    userQuery: string,
  ) {
    const header = `# Benchmark Trace: ${scenarioName}

**ID:** \`${scenarioId}\`
**Date:** ${new Date().toISOString()}
**Model:** \`${model}\`

## 1. Context
**Agent Rules:** \`${agentPath}\`
**User Query:**
> ${userQuery.replace(/\n/g, "\n> ")}

`;
    await Deno.writeTextFile(this.tracePath, header);
  }

  async logLLMInteraction(
    messages: { role: string; content: string }[],
    response: string,
  ) {
    let content = `## 2. LLM Interaction\n\n`;

    content += `### Input Messages\n`;
    for (const msg of messages) {
      // Truncate very long system prompts in trace to keep it readable,
      // or maybe keep it all? Let's keep it all for now but maybe collapsible if supported.
      // Markdown doesn't strictly support collapsible without HTML details tag.
      content += `**${msg.role.toUpperCase()}:**\n\n`;
      if (msg.role === "system") {
        content +=
          `<details><summary>System Prompt (Click to expand)</summary>\n\n${msg.content}\n\n</details>\n\n`;
      } else {
        content += `${msg.content}\n\n`;
      }
    }

    content += `### Model Output\n\n${response}\n\n`;
    await Deno.writeTextFile(this.tracePath, content, { append: true });
  }

  async logExecutionSection() {
    await Deno.writeTextFile(this.tracePath, `## 3. Execution Trace\n\n`, {
      append: true,
    });
  }

  async logCommand(
    command: string,
    exitCode: number,
    stdout: string,
    stderr: string,
  ) {
    let content = `**Command:** \`${command}\`\n`;
    content += `- **Exit Code:** ${exitCode}\n`;
    if (stdout.trim()) {
      content += `- **Stdout:**\n\`\`\`text\n${stdout.trim()}\n\`\`\`\n`;
    }
    if (stderr.trim()) {
      content += `- **Stderr:**\n\`\`\`text\n${stderr.trim()}\n\`\`\`\n`;
    }
    content += `\n`;
    await Deno.writeTextFile(this.tracePath, content, { append: true });
  }

  async logEvidence(gitStatus: string, gitLog: string) {
    let content = `## 4. Evidence State\n\n`;
    content += `### Git Status\n\`\`\`text\n${gitStatus.trim()}\n\`\`\`\n\n`;
    content += `### Git Log\n\`\`\`text\n${gitLog.trim()}\n\`\`\`\n\n`;
    await Deno.writeTextFile(this.tracePath, content, { append: true });
  }

  async logEvaluation(
    checklistResults: Record<string, { pass: boolean; reason?: string }>,
    checklist: BenchmarkChecklistItem[],
  ) {
    let content = `## 5. Evaluation\n\n`;

    for (const item of checklist) {
      const res = checklistResults[item.id];
      const mark = res?.pass ? "x" : " ";
      const status = !res?.pass
        ? (item.critical ? "(ERROR)" : "(WARNING)")
        : "";
      content += `- [${mark}] **${item.id}**: ${item.description} ${status}\n`;
      if (res?.reason) {
        content += `  - *Reason:* ${res.reason}\n`;
      }
    }
    content += `\n`;
    await Deno.writeTextFile(this.tracePath, content, { append: true });
  }

  async logSummary(
    result: {
      success: boolean;
      score: number;
      durationMs: number;
      tokensUsed: number;
    },
  ) {
    let content = `## Summary\n`;
    content += `- **Result:** ${result.success ? "PASSED" : "FAILED"}\n`;
    content += `- **Score:** ${result.score.toFixed(1)}%\n`;
    content += `- **Duration:** ${result.durationMs.toFixed(0)}ms\n`;
    content += `- **Tokens:** ${result.tokensUsed}\n`;
    await Deno.writeTextFile(this.tracePath, content, { append: true });
  }
}
