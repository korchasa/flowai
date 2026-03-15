export type { AgentAdapter, ParsedAgentOutput } from "./types.ts";
export { CursorAdapter } from "./cursor.ts";
export { ClaudeAdapter } from "./claude.ts";

import type { AgentAdapter } from "./types.ts";
import { CursorAdapter } from "./cursor.ts";
import { ClaudeAdapter } from "./claude.ts";

export const SUPPORTED_IDES = ["cursor", "claude"] as const;
export type SupportedIde = typeof SUPPORTED_IDES[number];

/** Creates an IDE-specific adapter by name. Throws if IDE is unsupported. */
export function createAdapter(ide: string): AgentAdapter {
  switch (ide) {
    case "cursor":
      return new CursorAdapter();
    case "claude":
      return new ClaudeAdapter();
    default:
      throw new Error(
        `Unknown IDE: "${ide}". Supported: ${SUPPORTED_IDES.join(", ")}`,
      );
  }
}
