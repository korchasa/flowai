import { codexChatCompletion, type ModelConfig } from "./llm.ts";
import type { BenchmarkChecklistItem, LLMMessage } from "./types.ts";
import { writeRunFile } from "./utils.ts";

export interface JudgeRequest {
  messages: LLMMessage[];
  jsonSchema: Record<string, unknown> & { required: string[] };
  /** The `<evidence>` block, kept on disk as `judge-evidence.md` for humans. */
  evidenceContent: string;
}

/**
 * Build the judge's prompt. Pure so the shape can be unit-tested.
 *
 * The evidence rides INSIDE the system message: `codex exec` reads one prompt
 * from stdin (no E2BIG, no append-file channel), and `codexPrompt` puts system
 * messages first, so the auditor persona, the evidence and the checklist arrive
 * in that order.
 */
export function buildJudgeRequest(
  userQuery: string,
  agentLogs: string,
  fileDiffs: string,
  checklist: BenchmarkChecklistItem[],
): JudgeRequest {
  const checklistJson = JSON.stringify(
    checklist.map((c) => ({ id: c.id, description: c.description })),
    null,
    2,
  );

  // Build JSON schema dynamically from checklist item IDs
  const jsonSchema = {
    type: "object" as const,
    properties: Object.fromEntries(
      checklist.map((c) => [c.id, {
        type: "object" as const,
        properties: {
          pass: { type: "boolean" as const },
          reason: { type: "string" as const },
        },
        required: ["pass", "reason"],
        additionalProperties: false,
      }]),
    ),
    required: checklist.map((c) => c.id),
    additionalProperties: false,
  };

  const evidenceContent = `
<evidence>
  <user_query>
  ${userQuery}
  </user_query>

  <agent_logs>
  ${agentLogs}
  </agent_logs>

  <file_diffs>
  ${fileDiffs}
  </file_diffs>
</evidence>
`;

  const systemPrompt = `
# ROLE
You are an impartial automated auditor for AI Agent acceptance tests.

# GOAL
Evaluate the agent's performance by comparing its actions and results against a provided checklist.

# CONTEXT
You are provided with the user's original query, the agent's execution logs, and the resulting file changes (diffs).
Your task is to verify if the agent successfully fulfilled the requirements based on the evidence.

# RULES
1. Base your judgment ONLY on the provided evidence in <evidence> below — do NOT use any tools to search for files or information.
2. Be strict: a "pass" is true only if the requirement is fully and clearly met.
3. The 'reason' field for each item must explain WHY it passed or failed based on specific evidence.
4. Do NOT attempt to read files, browse, run commands, or use any tools. Only analyze the text provided.
5. Write every 'reason' in English, whatever language the agent or the user wrote in.
6. Your final message must be ONLY the JSON verdict object — no prose around it.
${evidenceContent}`;

  const userMessage = `
<checklist_items>
${checklistJson}
</checklist_items>

Evaluate the agent performance against the checklist using the evidence above.
`;

  return {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    jsonSchema,
    evidenceContent,
  };
}

/**
 * Uses an LLM judge (via the Codex CLI) to evaluate agent performance against a
 * checklist. The evidence is also written to `<runDir>/judge-evidence.md` so a
 * failed run can be read without re-rendering the trace. Returns per-item
 * pass/fail with reasoning.
 */
export async function evaluateChecklist(
  userQuery: string,
  agentLogs: string,
  fileDiffs: string,
  checklist: BenchmarkChecklistItem[],
  judgeConfig: ModelConfig,
  runDir: string,
  llmClient: typeof codexChatCompletion = codexChatCompletion,
): Promise<{
  results: Record<string, { pass: boolean; reason: string }>;
  messages: LLMMessage[];
  response: string;
}> {
  const { messages, jsonSchema, evidenceContent } = buildJudgeRequest(
    userQuery,
    agentLogs,
    fileDiffs,
    checklist,
  );
  await writeRunFile(runDir, "judge-evidence.md", evidenceContent);

  const configWithSchema: ModelConfig = {
    ...judgeConfig,
    jsonSchema,
  };

  // Retry once on failure before marking all items as failed
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await llmClient(messages, configWithSchema);

      return {
        results: JSON.parse(response.content),
        messages,
        response: response.content,
      };
    } catch (error) {
      if (attempt === 0) {
        console.warn(
          `  Judge evaluation failed (attempt 1/2), retrying: ${error}`,
        );
        continue;
      }
      console.error("  Judge evaluation failed after 2 attempts:", error);
      const fallback: Record<string, { pass: boolean; reason: string }> = {};
      for (const item of checklist) {
        fallback[item.id] = {
          pass: false,
          reason: "Judge evaluation failed after 2 attempts",
        };
      }
      return {
        results: fallback,
        messages,
        response: "ERROR: Judge failed after 2 attempts",
      };
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error("Unreachable");
}
