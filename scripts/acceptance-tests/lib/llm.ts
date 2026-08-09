import type { LLMMessage, LLMResponse } from "./types.ts";

export interface ModelConfig {
  model: string;
  temperature: number;
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
 * Build the `codex exec` argv for ONE emulator turn.
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
}): string[] {
  return [
    "exec",
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

/**
 * Chat completion via the Codex CLI (`codex exec`). No API key — uses the
 * existing CLI auth under `CODEX_HOME`.
 *
 * Exists alongside `cliChatCompletion` rather than replacing it: the benchmark's
 * human emulator moved to codex with the Claude subject arm's retirement
 * (2026-08-09), while the acceptance-test judge still runs on `claude -p`.
 */
export async function codexChatCompletion(
  messages: LLMMessage[],
  config: {
    model: string;
    effort: string;
    env?: Record<string, string>;
    cwd?: string;
  },
  signal?: AbortSignal,
): Promise<LLMResponse> {
  const lastMessageFile = await Deno.makeTempFile({ prefix: "codex-reply-" });
  try {
    const cmd = new Deno.Command("codex", {
      args: codexExecArgs({
        model: config.model,
        effort: config.effort,
        lastMessageFile,
      }),
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
      env: { ...Deno.env.toObject(), ...(config.env ?? {}) },
      ...(config.cwd ? { cwd: config.cwd } : {}),
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
  }
}

interface ClaudeCliEvent {
  type?: string;
  result?: string;
  structured_output?: Record<string, unknown>;
  total_cost_usd?: number;
  usage?: Record<string, unknown>;
  message?: {
    content?: Array<{ type: string; text?: string }>;
  };
}

/** Chat completion via Claude CLI (`claude -p`). No API key needed — uses existing CLI auth. */
export async function cliChatCompletion(
  messages: LLMMessage[],
  configOrModel: ModelConfig | string,
  _temperature?: number,
  signal?: AbortSignal,
  /** Path to a file whose content is appended to the system prompt via --append-system-prompt-file. */
  appendSystemPromptFile?: string,
): Promise<LLMResponse> {
  const config: ModelConfig = typeof configOrModel === "string"
    ? { model: configOrModel, temperature: 0 }
    : { ...configOrModel };

  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const userMsg = messages.filter((m) => m.role !== "system")
    .map((m) => m.content).join("\n\n");

  const args = [
    "-p",
    "--model",
    config.model,
    "--output-format",
    "json",
    "--no-session-persistence",
    "--verbose",
    "--tools",
    "StructuredOutput",
    "--strict-mcp-config",
  ];

  if (systemMsg) {
    args.push("--system-prompt", systemMsg);
  }

  if (config.jsonSchema) {
    args.push("--json-schema", JSON.stringify(config.jsonSchema));
  }

  if (appendSystemPromptFile) {
    args.push("--append-system-prompt-file", appendSystemPromptFile);
  }

  // Pass user message via stdin to avoid E2BIG when trace is large
  const userMsgBytes = new TextEncoder().encode(userMsg).length;
  if (userMsgBytes > 100_000) {
    console.warn(
      `  [llm] Large stdin payload: ${(userMsgBytes / 1024).toFixed(0)}KB`,
    );
  }
  const cmd = new Deno.Command("claude", {
    args,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
    env: { ...Deno.env.toObject(), CLAUDECODE: "", ...(config.env ?? {}) },
    ...(config.cwd ? { cwd: config.cwd } : {}),
    signal,
  });

  const process = cmd.spawn();
  const writer = process.stdin.getWriter();
  await writer.write(new TextEncoder().encode(userMsg));
  await writer.close();
  const output = await process.output();
  const stdout = new TextDecoder().decode(output.stdout);

  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    // Extract result event for better diagnostics
    let resultInfo = "";
    try {
      const events = JSON.parse(stdout) as ClaudeCliEvent[];
      const resultEvt = events.find((e) => e.type === "result");
      if (resultEvt) {
        resultInfo = ` result=${JSON.stringify(resultEvt).slice(0, 500)}`;
      }
    } catch (_) {
      resultInfo = ` stdout_len=${stdout.length}`;
    }
    throw new Error(
      `Claude CLI failed (exit ${output.code}): stderr=${
        stderr || "(empty)"
      }${resultInfo}`,
    );
  }

  const events = JSON.parse(stdout) as ClaudeCliEvent[];
  const resultEvent = events.find((e) => e.type === "result");

  if (!resultEvent) {
    throw new Error("Claude CLI: no result event in output");
  }

  // With --json-schema: structured_output contains validated JSON
  if (config.jsonSchema && resultEvent.structured_output) {
    return {
      content: JSON.stringify(resultEvent.structured_output),
      usage: undefined,
    };
  }

  // Without --json-schema: extract text from last assistant event
  const assistantEvents = events.filter((e) => e.type === "assistant");
  const lastAssistant = assistantEvents[assistantEvents.length - 1];
  const contentBlocks = lastAssistant?.message?.content;
  const text = contentBlocks?.find((b) => b.type === "text")?.text ?? "";

  return { content: text, usage: undefined };
}
