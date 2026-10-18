/**
 * Judge transport dispatch (FR-ACCEPT.JUDGE-ACP). The acceptance judge and the
 * user emulator call `chatCompletion`; a claude model goes over the claude ACP
 * bridge, every other model over the codex app-server
 * (FR-ACCEPT.JUDGE-APPSERVER). Kept apart from `llm.ts` because the ACP module
 * already imports `llm.ts`.
 */
import {
  closeCodexSessions,
  type CodexCallConfig,
  codexChatCompletion,
  prewarmCodexSession,
} from "./llm.ts";
import {
  type ClaudeCallConfig,
  claudeChatCompletion,
  closeClaudeJudgeSessions,
  prewarmClaudeJudge,
} from "./acp/claude_judge.ts";
import type { LLMMessage, LLMResponse } from "./types.ts";

export type JudgeTransport = "claude-acp" | "codex-appserver";

/** Which transport serves a model, by its name. */
export function judgeTransportFor(model: string): JudgeTransport {
  return /^claude/i.test(model) ? "claude-acp" : "codex-appserver";
}

/** A call config either transport accepts; each reads its own fields. */
export type JudgeCallConfig = CodexCallConfig & ClaudeCallConfig;

/** Chat completion routed by model name. */
export function chatCompletion(
  messages: LLMMessage[],
  config: JudgeCallConfig,
  signal?: AbortSignal,
): Promise<LLMResponse> {
  return judgeTransportFor(config.model) === "claude-acp"
    ? claudeChatCompletion(messages, config, signal)
    : codexChatCompletion(messages, config, signal);
}

/** Open the judge's transport ahead of its first prompt. */
export function prewarmJudgeSession(config: JudgeCallConfig): Promise<void> {
  return judgeTransportFor(config.model) === "claude-acp"
    ? prewarmClaudeJudge(config)
    : prewarmCodexSession(config);
}

/** Close every pooled judge session of both transports. */
export async function closeJudgeSessions(): Promise<void> {
  closeCodexSessions();
  await closeClaudeJudgeSessions();
}
