import type { LLMMessage, LLMResponse } from "./types.ts";

export interface ModelConfig {
  model: string;
  temperature: number;
  /** Codex reasoning effort (`low` … `xhigh`). Pinned per call so a verdict
   * never inherits the operator's `~/.codex/config.toml`; defaults to
   * `medium` when a config omits it. */
  effort?: string;
  jsonSchema?: Record<string, unknown>;
  /** Extra environment for the spawned CLI (e.g. an isolated `HOME` so a
   * programmatic judge does not inherit the developer's personal memory). */
  env?: Record<string, string>;
  /** Working directory for the spawned CLI. Ancestor-directory memory files
   * (`CLAUDE.md`/`AGENTS.md` up the cwd path) load regardless of `HOME`; a cwd
   * outside the developer's home is the only way to exclude them. */
  cwd?: string;
  provider?: {
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
    data_collection?: "allow" | "deny";
  };
  [key: string]: unknown;
}

export interface IdeConfig {
  agent_models: string[];
  default_agent_model: string;
  /** Reasoning effort for the agent under test (codex only). */
  agent_effort?: string;
  judge: ModelConfig;
}

export interface BenchmarkConfig {
  default_ides: string[];
  ides: Record<string, IdeConfig>;
}

/** Get IDE-specific config */
export function getIdeConfig(
  config: BenchmarkConfig,
  ide: string,
): IdeConfig {
  const ideSection = config.ides[ide];
  if (!ideSection) {
    throw new Error(
      `No configuration found for IDE "${ide}". Available: ${
        Object.keys(config.ides).join(", ")
      }`,
    );
  }
  return ideSection;
}

/**
 * Loads the benchmark configuration file (`acceptance-tests/config.json` by default).
 * Throws with an actionable message when the file is missing or malformed.
 */
export async function loadConfig(
  path = "acceptance-tests/config.json",
): Promise<BenchmarkConfig> {
  try {
    const content = await Deno.readTextFile(path);
    const config = JSON.parse(content) as BenchmarkConfig;
    return config;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Error(
        `Configuration file not found at ${path}. Please create it to run benchmarks.`,
      );
    }
    throw e;
  }
}

/**
 * Build the `codex exec` argv for ONE turn of a programmatic caller — the
 * benchmark's human emulator, the acceptance-test judge, the user emulator.
 *
 * Pure so the pinning can be unit-tested without spawning a session. Every flag
 * here is deliberate:
 * - `--model` + `-c model_reasoning_effort` pin the campaign's operating point;
 *   `~/.codex/config.toml` sets both globally on a developer machine, and an
 *   un-pinned emulator would take its effort from whoever launched the run.
 * - `--ignore-user-config` keeps that file out entirely (auth still resolves
 *   through `CODEX_HOME`).
 * - `--sandbox read-only` — the emulator plays the human in a conversation and
 *   has no business editing the workspace. Structural, not a promise in a prompt.
 * - `--skip-git-repo-check` because it runs from a temp cwd outside any repo.
 * - `--output-last-message` is the clean way to get the final reply; parsing it
 *   out of the event stream would also pick up the agent's intermediate chatter.
 * - `--output-schema` (only when the caller supplies a schema) makes codex
 *   validate the final message against a JSON schema, which is how the judge
 *   gets a per-item verdict object instead of prose to parse.
 * - trailing `-` makes codex read the prompt from stdin, which avoids E2BIG on
 *   a long conversation.
 *
 * Session files are deliberately NOT suppressed (`--ephemeral` is absent): the
 * rollout lands under the emulator's OWN `CODEX_HOME` (FR-BENCH-SWE.ISOLATION —
 * separate from the agent under test) and its tokens are harvested into the
 * arm's overhead, matching how the gate emulator was always accounted.
 */
export function codexExecArgs(opts: {
  model: string;
  effort: string;
  lastMessageFile: string;
  outputSchemaFile?: string;
}): string[] {
  return [
    "exec",
    ...(opts.outputSchemaFile
      ? ["--output-schema", opts.outputSchemaFile]
      : []),
    "--model",
    opts.model,
    "-c",
    `model_reasoning_effort="${opts.effort}"`,
    "--ignore-user-config",
    "--sandbox",
    "read-only",
    "--skip-git-repo-check",
    "--color",
    "never",
    "--output-last-message",
    opts.lastMessageFile,
    "-",
  ];
}

/**
 * Fold a chat-shaped message list into the single prompt `codex exec` accepts.
 * There is no separate system channel, so the persona leads the text or it is
 * lost; the remaining turns keep their order and are labelled by role.
 */
export function codexPrompt(messages: LLMMessage[]): string {
  const system = messages.filter((m) => m.role === "system").map((m) =>
    m.content
  );
  const rest = messages.filter((m) => m.role !== "system").map((m) =>
    `[${m.role}]\n${m.content}`
  );
  return [...system, ...rest].join("\n\n");
}

/** Default reasoning effort for a programmatic codex turn. */
export const DEFAULT_CODEX_EFFORT = "medium";

/**
 * Chat completion via the Codex CLI (`codex exec`). No API key — uses the
 * existing CLI auth under `CODEX_HOME`.
 *
 * The single LLM transport of the harness: the benchmark's human emulator moved
 * here when the Claude subject arm was retired (2026-08-09), and the
 * acceptance-test judge and user emulator followed on 2026-09-01, when a
 * `-p 4` sweep on `claude -p` burned the account's whole subscription window in
 * five hours (250M cache-read tokens, 583 sessions in a day).
 *
 * `config.jsonSchema` turns on `--output-schema`: the reply is then the
 * validated JSON object itself. `config.cwd` defaults to a fresh temp dir so a
 * caller that forgets to isolate itself never runs from the repo — codex reads
 * `AGENTS.md` up the cwd path regardless of `--ignore-user-config`.
 */
export async function codexChatCompletion(
  messages: LLMMessage[],
  config: {
    model: string;
    effort?: string;
    jsonSchema?: Record<string, unknown>;
    env?: Record<string, string>;
    cwd?: string;
  },
  signal?: AbortSignal,
): Promise<LLMResponse> {
  const lastMessageFile = await Deno.makeTempFile({ prefix: "codex-reply-" });
  const outputSchemaFile = config.jsonSchema
    ? await Deno.makeTempFile({ prefix: "codex-schema-", suffix: ".json" })
    : undefined;
  const ownCwd = config.cwd
    ? undefined
    : await Deno.makeTempDir({ prefix: "codex-cwd-" });
  try {
    if (outputSchemaFile) {
      await Deno.writeTextFile(
        outputSchemaFile,
        JSON.stringify(config.jsonSchema),
      );
    }
    const cmd = new Deno.Command("codex", {
      args: codexExecArgs({
        model: config.model,
        effort: config.effort ?? DEFAULT_CODEX_EFFORT,
        lastMessageFile,
        outputSchemaFile,
      }),
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
      env: { ...Deno.env.toObject(), ...(config.env ?? {}) },
      cwd: config.cwd ?? ownCwd,
      signal,
    });
    const process = cmd.spawn();
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(codexPrompt(messages)));
    await writer.close();
    const output = await process.output();

    if (!output.success) {
      const stderr = new TextDecoder().decode(output.stderr);
      throw new Error(
        `Codex CLI failed (exit ${output.code}): stderr=${stderr || "(empty)"}`,
      );
    }
    const content = (await Deno.readTextFile(lastMessageFile)).trim();
    if (content === "") {
      // A blank human turn leaves the engineer with no instruction — the
      // benchmark treats that as a dead emulator, never as silence to guess at.
      throw new Error("Codex CLI: empty final message");
    }
    return { content, usage: undefined };
  } finally {
    await Deno.remove(lastMessageFile).catch(() => {});
    if (outputSchemaFile) await Deno.remove(outputSchemaFile).catch(() => {});
    if (ownCwd) await Deno.remove(ownCwd, { recursive: true }).catch(() => {});
  }
}

/** Shape of an injectable chat-completion client (tests swap in a stub). */
export type ChatCompletionFn = typeof codexChatCompletion;
