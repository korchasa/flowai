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
    const llmMessages: LLMMessage[] = [
      {
        role: "system",
        content: `You are a simulated user in a CLI environment. 
Your persona: ${this.persona}

TASK:
1. Analyze the conversation history between you (user) and the AI agent (assistant).
2. Determine if the agent is waiting for your input (e.g., asking a question, requesting confirmation, or showing a prompt).
3. If the agent is NOT waiting for input and you should let it continue, respond strictly with "<NO_RESPONSE>".
4. If the agent IS waiting for input, provide the response according to your persona.

RULES:
- Respond ONLY with the input string to send to the agent, or "<NO_RESPONSE>".
- "If the agent does not address you, respond strictly with <NO_RESPONSE>".
- Do not include any explanations or quotes.
- If the agent asks a multiple-choice question, pick one based on your persona.
- If the agent asks for confirmation, say 'yes' or 'no' based on your persona.`,
      },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
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
