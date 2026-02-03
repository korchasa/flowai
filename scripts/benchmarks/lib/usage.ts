import { join } from "@std/path";
import { exists } from "@std/fs";

export interface SessionUsage {
  sessionId: string;
  projectId: string;
  projectPath: string;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  model: string;
}

/**
 * Approximation: 1 token is roughly 4 characters for English/Code.
 */
const CHARS_PER_TOKEN = 4;

/**
 * Finds the project directory containing the session transcript.
 */
export async function findSessionTranscript(
  sessionId: string,
): Promise<string | null> {
  const projectsDir = "/Users/korchasa/.cursor/projects";
  try {
    for await (const entry of Deno.readDir(projectsDir)) {
      if (entry.isDirectory) {
        const transcriptPath = join(
          projectsDir,
          entry.name,
          "agent-transcripts",
          `${sessionId}.txt`,
        );
        if (await exists(transcriptPath)) {
          return transcriptPath;
        }
      }
    }
  } catch (e) {
    console.error(`Error searching for session ${sessionId}:`, e);
  }
  return null;
}

/**
 * Calculates usage (tokens and cost) for a given session ID.
 * Parses the transcript from ~/.cursor/projects/<project>/agent-transcripts/<id>.txt
 */
export async function calculateSessionUsage(
  sessionId: string,
): Promise<SessionUsage | null> {
  const transcriptPath = await findSessionTranscript(sessionId);
  if (!transcriptPath) return null;

  const content = await Deno.readTextFile(transcriptPath);
  const pathParts = transcriptPath.split("/");
  const projectId = pathParts[pathParts.length - 3];

  // Try to find the actual project path from tool calls or context
  let projectPath = "";
  const listDirMatch = content.match(
    /\[Tool call\] list_dir\s+target_directory: ([^\n]+)/,
  );
  if (listDirMatch) {
    projectPath = listDirMatch[1].trim();
  } else {
    // Fallback: try to reconstruct from projectId if it looks like a path
    if (projectId.startsWith("Users-")) {
      projectPath = "/" + projectId.replace(/-/g, "/");
    }
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheWriteTokens = 0;

  // Split by roles to attribute tokens
  const sections = content.split(/^(user:|assistant:)/m).filter((s) =>
    s.trim()
  );

  let cumulativeContextChars = 0;
  let currentTurnInputChars = 0;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    if (section === "user:") {
      const userMessage = sections[++i] || "";
      currentTurnInputChars = userMessage.length;

      // Calculate tokens for this turn
      const inputTokens = Math.ceil(currentTurnInputChars / CHARS_PER_TOKEN);
      const cacheReadTokens = Math.ceil(
        cumulativeContextChars / CHARS_PER_TOKEN,
      );

      totalInputTokens += inputTokens;
      totalCacheReadTokens += cacheReadTokens;
      totalCacheWriteTokens += inputTokens; // Assume new input is written to cache

      // Update cumulative context for next turn
      cumulativeContextChars += currentTurnInputChars;
      continue;
    }

    if (section === "assistant:") {
      const assistantMessage = sections[++i] || "";
      const outputTokens = Math.ceil(assistantMessage.length / CHARS_PER_TOKEN);

      totalOutputTokens += outputTokens;

      // Assistant response also becomes part of the context for the next turn
      cumulativeContextChars += assistantMessage.length;
      continue;
    }
  }

  const totalTokens = totalInputTokens + totalOutputTokens +
    totalCacheReadTokens;

  return {
    sessionId,
    projectId,
    projectPath,
    tokens: {
      input: totalInputTokens,
      output: totalOutputTokens,
      cacheRead: totalCacheReadTokens,
      cacheWrite: totalCacheWriteTokens,
      total: totalTokens,
    },
    model: "estimated (gemini-3-flash-preview baseline)",
  };
}

if (import.meta.main) {
  const sessionId = Deno.args[0] || "0078fcf1-8d9c-4911-8ac0-a4b3cf9aef78";
  const usage = await calculateSessionUsage(sessionId);
  if (usage) {
    console.log(JSON.stringify(usage, null, 2));
  } else {
    console.error(`Session ${sessionId} not found.`);
    Deno.exit(1);
  }
}
