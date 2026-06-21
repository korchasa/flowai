export type { AgentAdapter, ParsedAgentOutput } from "./types.ts";

import type { AgentAdapter } from "./types.ts";
import { prepareAcpClaudeHome } from "../acp/auth.ts";
import { ACP_AGENTS, ACP_LIB_VERSION, type AcpIde } from "../acp/registry.ts";

export const SUPPORTED_IDES = Object.keys(ACP_AGENTS) as AcpIde[];
export type SupportedIde = AcpIde;

/**
 * Builds the data-only IDE profile from the ACP registry (FR-ACCEPT.ACP). The
 * per-IDE behavioural classes were retired with the direct transport — the
 * profile carries only the facts the runner needs; the agent is driven through
 * `AcpClient`. Throws if the IDE is unsupported.
 */
export function createAdapter(ide: string): AgentAdapter {
  const spec = ACP_AGENTS[ide as AcpIde];
  if (!spec) {
    throw new Error(
      `Unknown IDE: "${ide}". Supported: ${SUPPORTED_IDES.join(", ")}`,
    );
  }
  return {
    ide: spec.ide,
    configDir: spec.configDir,
    // Claude needs the isolated bench-home so sandbox skills win over
    // ~/.claude/skills/ and Keychain subscription auth survives the wrapper.
    prepareWorkspace: spec.ide === "claude"
      ? (sandboxPath: string) => prepareAcpClaudeHome(sandboxPath)
      : undefined,
    // ACP token usage is not yet surfaced by the wrapper — best-effort null.
    calculateUsage: () => Promise.resolve(null),
    // The pinned ACP lib version stands in for the per-IDE CLI version.
    cliVersion: () => Promise.resolve(ACP_LIB_VERSION),
  };
}
