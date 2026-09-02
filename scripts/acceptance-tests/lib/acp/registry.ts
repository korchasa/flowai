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
  /**
   * The character that turns `<name> <args>` into an explicit skill invocation
   * on this IDE — see {@link commandPrefixFor}.
   */
  readonly commandPrefix: CommandPrefix;
}

/** Skill-invocation prefix: `/` for Claude and the rest, `$` for Codex. */
export type CommandPrefix = "/" | "$";

/**
 * implements [FR-BENCH-SWE.IDE](../../../../documents/requirements.md#fr-bench-swe.ide-codex-is-the-ide-under-test-ancfrbench-swe-ide),
 * [FR-ACCEPT.ACP](../../../../documents/requirements.md#fr-accept.acp-acp-transport-for-acceptance-test-runner-ancfraccept.acp):
 * the skill-invocation prefix is IDE-dependent, and the wrong one silently
 * disables the skill under test.
 *
 * Measured on the codex ACP bridge (2026-07-24, again 2026-09-02 across all 22
 * `plan` scenarios): `@agentclientprotocol/codex-acp` parses a leading
 * `/<name>` as one of ITS OWN commands before the model sees the turn.
 * `/plan <args>` is its plan-mode toggle and is rejected outright —
 * `Command "/plan" requires no arguments.` — and `/review <args>` runs codex's
 * built-in review with the text as instructions; in both cases the installed
 * skill never runs. The documented codex form `$plan <args>` passes the bridge
 * (a `$`-prefixed name is never a bridge command) and fires the skill
 * (transcript: "I'm using the `plan` skill because you explicitly requested
 * `$plan`", then it reads `.codex/skills/plan/SKILL.md`).
 *
 * Unknown IDEs keep the historical slash rather than guessing a new syntax.
 */
export function commandPrefixFor(ide: string): CommandPrefix {
  return ide === "codex" ? "$" : "/";
}

/**
 * Rewrite a scenario's `/<name> <args…>` turn into the IDE's native
 * invocation, `<prefix><name> <args…>`. Only a leading slash command is
 * touched — the name is the run of `[A-Za-z0-9:_-]` right after the slash, the
 * same token the Claude Agent SDK parses — so prose, indented text and any
 * later `/word` stay byte-identical. Scenarios keep the cross-IDE slash form
 * (FR-IDE-SCOPE); the transport adapts it, so an IDE under test is never
 * measured on a different prompt than the others beyond that one character.
 */
export function nativeCommandTurn(
  prompt: string,
  prefix: CommandPrefix,
): string {
  if (prefix === "/") return prompt;
  return prompt.replace(/^\/(?=[A-Za-z0-9:_-]+(?:\s|$))/, prefix);
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
    commandPrefix: "/",
  },
  cursor: {
    ide: "cursor",
    launch: { command: "cursor-agent", args: ["--acp"] },
    authMode: "native",
    configDir: ".cursor",
    commandPrefix: "/",
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
    commandPrefix: "$",
  },
  opencode: {
    ide: "opencode",
    launch: { command: "opencode", args: ["acp"] },
    authMode: "native",
    configDir: ".opencode",
    commandPrefix: "/",
  },
} as const;

/** Stable, serialisable fingerprint of the registry for the cache-key. */
export function acpRegistryFingerprint(): string {
  return JSON.stringify(ACP_AGENTS);
}
