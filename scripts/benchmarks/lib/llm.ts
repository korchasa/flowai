import { LLMMessage, LLMResponse } from "./types.ts";

const DEFAULT_MODEL = "google/gemini-2.0-flash-001"; // Fast and cheap for the agent

export async function chatCompletion(
  messages: LLMMessage[],
  model: string = DEFAULT_MODEL,
  temperature: number = 0,
  signal?: AbortSignal,
): Promise<LLMResponse> {
  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

  if (!OPENROUTER_API_KEY) {
    console.warn(
      "WARNING: OPENROUTER_API_KEY is not set. LLM calls will fail.",
    );
    throw new Error("OPENROUTER_API_KEY is not set.");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cursor.sh", // Optional, for OpenRouter rankings
        "X-Title": "Cursor IDE Rules Benchmark", // Optional
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
      signal,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OpenRouter API error: ${response.status} ${response.statusText} - ${text}`,
    );
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}
