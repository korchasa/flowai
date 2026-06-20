/**
 * Declarative ACP agent registry (FR-ACCEPT.ACP).
 *
 * The thin DATA seam that survives the migration: one row per supported IDE
 * describing how to launch its ACP server, the auth model, and the IDE's config
 * dir. This replaces the per-IDE `AgentAdapter` *logic* (buildArgs / parseOutput
 * / setupMocks) with a connection + a launch spec — onboarding a new IDE becomes
 * adding a row, not writing a class.
 *
 * `command`/`args` are spawned by `AcpAgent` under the same
 * `setpgrp_exec.py` process-group wrapping + watchdog (FR-ACCEPT-GUARDS), so a
 * wrapper child (`npx claude-code-acp`) and its descendants stay inside the
 * killed group.
 */

/**
 * Pinned version of the official ACP client library. Kept in lock-step with the
 * `npm:@zed-industries/agent-client-protocol@<v>` import specifiers across this
 * dir. Folded into the benchmark cache-key (FR-ACCEPT-CACHE) so a lib upgrade
 * invalidates stale ACP verdicts.
 */
export const ACP_LIB_VERSION = "0.4.5";

export type AcpIde = "claude" | "cursor" | "codex" | "opencode";

/** How an agent authenticates — affects which env the launcher forwards. */
export type AcpAuthMode = "subscription" | "api-key" | "native";

export interface AcpAgentSpec {
  readonly ide: AcpIde;
  /** Process launch spec for the ACP server (data, not logic). */
  readonly launch: {
    readonly command: string;
    readonly args: readonly string[];
    /** Extra env merged over the isolated launch env (e.g. unset CLAUDECODE). */
    readonly env?: Readonly<Record<string, string>>;
  };
  readonly authMode: AcpAuthMode;
  /** IDE config dir relative to the sandbox (e.g. ".claude"). */
  readonly configDir: string;
}

/**
 * One spec per IDE.
 *
 * Claude is reached via the `claude-code-acp` wrapper over the Claude Agent SDK.
 * Phase-0 spike (2026-06-21) proved subscription auth (Keychain via the
 * code-signed binary) survives through the wrapper with NO `ANTHROPIC_API_KEY`
 * → `authMode: "subscription"`. The package is being renamed to
 * `@agentclientprotocol/claude-agent-acp`; the old name still resolves. Pin a
 * version so the cache-key (FR-ACCEPT-CACHE) invalidates on upgrade.
 */
export const ACP_AGENTS: Readonly<Record<AcpIde, AcpAgentSpec>> = {
  claude: {
    ide: "claude",
    launch: {
      command: "npx",
      args: ["-y", "@zed-industries/claude-code-acp@0.16.2"],
      // Allow spawning claude inside a claude session (mirrors ClaudeAdapter.getEnv).
      env: { CLAUDECODE: "" },
    },
    authMode: "subscription",
    configDir: ".claude",
  },
  cursor: {
    ide: "cursor",
    launch: { command: "cursor-agent", args: ["--acp"] },
    authMode: "native",
    configDir: ".cursor",
  },
  codex: {
    ide: "codex",
    launch: { command: "codex", args: ["acp"] },
    authMode: "api-key",
    configDir: ".codex",
  },
  opencode: {
    ide: "opencode",
    launch: { command: "opencode", args: ["acp"] },
    authMode: "native",
    configDir: ".opencode",
  },
} as const;

/** Stable, serialisable fingerprint of the registry for the cache-key. */
export function acpRegistryFingerprint(): string {
  return JSON.stringify(ACP_AGENTS);
}
