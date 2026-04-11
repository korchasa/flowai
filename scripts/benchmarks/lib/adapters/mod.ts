export type { AgentAdapter, ParsedAgentOutput } from "./types.ts";
export { CursorAdapter } from "./cursor.ts";
export { ClaudeAdapter } from "./claude.ts";
export { CodexAdapter } from "./codex.ts";

import type { AgentAdapter } from "./types.ts";
import { CursorAdapter } from "./cursor.ts";
import { ClaudeAdapter } from "./claude.ts";
import { CodexAdapter } from "./codex.ts";

export const SUPPORTED_IDES = ["cursor", "claude", "codex"] as const;
export type SupportedIde = typeof SUPPORTED_IDES[number];

/** Creates an IDE-specific adapter by name. Throws if IDE is unsupported. */
export function createAdapter(ide: string): AgentAdapter {
  switch (ide) {
    case "cursor":
      return new CursorAdapter();
    case "claude":
      return new ClaudeAdapter();
    case "codex":
      return new CodexAdapter();
    default:
      throw new Error(
        `Unknown IDE: "${ide}". Supported: ${SUPPORTED_IDES.join(", ")}`,
      );
  }
}
