import { chatCompletion, type ModelConfig } from "./llm.ts";
import type { LLMMessage } from "./types.ts";

export interface UserEmulatorOptions {
  persona: string;
  config: ModelConfig;
  llmClient?: typeof chatCompletion;
}

/** Simulates user responses in interactive benchmark scenarios using an LLM with a given persona. */
export class UserEmulator {
  private persona: string;
  private config: ModelConfig;
  private llm: typeof chatCompletion;

  constructor(options: UserEmulatorOptions) {
    this.persona = options.persona;
    this.config = options.config;
    this.llm = options.llmClient || chatCompletion;
  }

  /**
   * Decides if the agent is waiting for input and provides the response.
   * Returns null if no input is needed.
   */
  async getResponse(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string | null> {
    // Build conversation summary for the LLM
    // Use a single user message to avoid model-specific issues with system+multi-turn patterns
    const conversationLines = messages.map((m) =>
      `[${m.role.toUpperCase()}]: ${m.content}`
    ).join("\n\n");

    const llmMessages: LLMMessage[] = [
      {
        role: "user",
        content: `You are a simulated user with this persona: ${this.persona}

Below is a conversation between you (USER) and an AI agent (ASSISTANT). The agent may write in any language (English, Russian, etc.).

${conversationLines}

---
TASK: Is the agent asking YOU a question or waiting for your input? Look for question marks (?), requests to choose/select/confirm, or similar prompts in any language.

If YES — reply with your response according to your persona. Keep it short (1-2 sentences). Do not add quotes or formatting.
If NO — reply with exactly: <NO_RESPONSE>`,
      },
    ];

    const response = await this.llm(llmMessages, this.config);
    if (!response.content) {
      return null;
    }
    const content = response.content.trim();

    if (content === "<NO_RESPONSE>") {
      return null;
    }

    return content;
  }
}
