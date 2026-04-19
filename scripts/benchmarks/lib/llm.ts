import type { LLMMessage, LLMResponse } from "./types.ts";

export interface ModelConfig {
  model: string;
  temperature: number;
  jsonSchema?: Record<string, unknown>;
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
 * Loads the benchmark configuration file (`benchmarks/config.json` by default).
 * Throws with an actionable message when the file is missing or malformed.
 */
export async function loadConfig(
  path = "benchmarks/config.json",
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
    env: { ...Deno.env.toObject(), CLAUDECODE: "" },
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
