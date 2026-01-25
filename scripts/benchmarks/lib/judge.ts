import { chatCompletion } from "./llm.ts";
import { BenchmarkChecklistItem, LLMMessage } from "./types.ts";

export async function evaluateChecklist(
  userQuery: string,
  agentLogs: string,
  fileDiffs: string,
  checklist: BenchmarkChecklistItem[],
): Promise<Record<string, { pass: boolean; reason: string }>> {
  const checklistJson = JSON.stringify(
    checklist.map((c) => ({ id: c.id, description: c.description })),
    null,
    2,
  );

  const systemPrompt = `
# ROLE
You are an impartial automated auditor for AI Agent benchmarks.

# GOAL
<objective>
Evaluate the agent's performance by comparing its actions and results against a provided checklist.
</objective>

# CONTEXT
<context_description>
You are provided with the user's original query, the agent's execution logs, and the resulting file changes (diffs).
Your task is to verify if the agent successfully fulfilled the requirements based on the evidence.
</context_description>

# RULES
<rules>
1. Base your judgment ONLY on the provided evidence in <evidence>.
2. Be strict: a "pass" is true only if the requirement is fully and clearly met.
3. Output ONLY a valid JSON object. No markdown blocks, no preamble, no explanation outside the JSON.
4. The 'reason' field for each item must explain WHY it passed or failed based on specific evidence.
</rules>

# INSTRUCTIONS
<instructions>
1. Carefully analyze the data in <evidence>.
2. Compare the evidence against each item in <checklist_items>.
3. For each item, provide a "reason" (string) and a "pass" (boolean).
4. Construct and output the final JSON object.
</instructions>

# EXAMPLE OUTPUT
{
  "check_id_1": {
    "reason": "The agent executed 'git commit' and the diff shows the expected changes in main.ts.",
    "pass": true
  },
  "check_id_2": {
    "reason": "The agent failed to update the README.md file as requested.",
    "pass": false
  }
}
`;

  const userMessage = `
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

<checklist_items>
${checklistJson}
</checklist_items>

Evaluate the agent performance now.
`;

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  try {
    // Using a slightly smarter model for judging if needed, but flash is usually good for this
    const response = await chatCompletion(
      messages,
      "google/gemini-2.0-flash-001",
      0,
    );

    // Clean up potential markdown code blocks
    let cleanContent = response.content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.replace(/^```json/, "").replace(/```$/, "");
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```/, "").replace(/```$/, "");
    }

    return JSON.parse(cleanContent);
  } catch (error) {
    console.error("Error in Judge evaluation:", error);
    // Return all false if judge fails, to be safe
    const fallback: Record<string, { pass: boolean; reason: string }> = {};
    for (const item of checklist) {
      fallback[item.id] = { pass: false, reason: "Judge evaluation failed" };
    }
    return fallback;
  }
}
