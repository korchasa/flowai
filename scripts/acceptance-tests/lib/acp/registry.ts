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
 * `npm:@agentclientprotocol/sdk@<v>` import specifiers across this
 * dir. Folded into the benchmark cache-key (FR-ACCEPT-CACHE) so a lib upgrade
 * invalidates stale ACP verdicts.
 */
export const ACP_LIB_VERSION = "1.3.0";

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
 * → `authMode: "subscription"`. The rename to
 * `@agentclientprotocol/claude-agent-acp` completed: npm marks the old
 * `@zed-industries/claude-code-acp` deprecated ("please migrate to continue
 * receiving updates") and freezes it at 0.16.2, which is why a `latest` check
 * against the old name looks reassuring and answers nothing — the new name was
 * 52 releases ahead. Pin a version so the cache-key (FR-ACCEPT-CACHE)
 * invalidates on upgrade.
 *
 * Codex is likewise reached through an npm bridge, NOT through its own CLI:
 * codex-cli (verified 0.144.6) has no `acp` subcommand, so the former
 * `codex acp` row started the interactive TUI with "acp" as the prompt and the
 * codex transport could never have worked. `@agentclientprotocol/codex-acp`
 * speaks ACP over the Codex app-server and supports ChatGPT-subscription login
 * (`~/.codex/auth.json`), so no API key is provisioned for the bench.
 */
export const ACP_AGENTS: Readonly<Record<AcpIde, AcpAgentSpec>> = {
  claude: {
    ide: "claude",
    launch: {
      command: "npx",
      args: ["-y", "@agentclientprotocol/claude-agent-acp@0.68.0"],
      // Allow spawning claude inside a claude session (unset the marker the
      // outer Claude Code session exports).
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
    launch: {
      command: "npx",
      args: ["-y", "@agentclientprotocol/codex-acp@1.1.7"],
      // Start in full-access agent mode: the bridge's default mode may be
      // read-only, which would let a bench session "finish" having written
      // nothing and score as an honest miss (FR-BENCH-SWE.IDE).
      env: { INITIAL_AGENT_MODE: "agent-full-access" },
    },
    authMode: "subscription",
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
