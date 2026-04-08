# AI Skeleton Tools

TypeScript foundation for AI agents and LLM workflows with structured logging, cost tracking, stateful chat, and content fetchers.

Current version: `0.7.27`.

## Runtime

- Deno `2.x`
- API keys for providers you use (`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, etc.)

## Installation

```bash
deno add jsr:@korchasa/ai-skel-ts
```

## Core Capabilities

- Provider-agnostic LLM requester via `ModelURI` (`chat://provider/model`) with streaming support
- Structured output with Zod validation, retry-based self-correction, and streaming
- Stateful `Agent` with optional local tools, MCP tools, and streaming capabilities
- Conversation compaction (`SimpleHistoryCompactor`, `SummarizingHistoryCompactor`)
- Local HTML content extraction (`fetch`, `fetchFromURL`)
- Jina reader/search client (`JinaScraper`)
- Brave web search client (`BraveSearchClient`)
- Per-run debug artifacts through `RunContext`
- Global token/cost accounting through `CostTracker`

## Quick Start

### LLM Requester

```ts
import {
  CostTracker,
  Logger,
  ModelURI,
  createLlmRequester,
  createRunContext,
  z,
} from "@korchasa/ai-skel-ts";

const logger = new Logger({ context: "readme", logLevel: "info" });
const ctx = createRunContext({ logger, debugDir: "./tmp/debug/readme" });

const llm = createLlmRequester({
  modelUri: ModelURI.parse("chat://openrouter/meta-llama/llama-3-8b-instruct"),
  logger,
  costTracker: CostTracker.getInstance(),
  ctx,
});

const result = await llm({
  messages: [{ role: "user", content: "Return JSON with field message" }],
  identifier: "quick-start",
  schema: z.object({ message: z.string() }),
  tools: undefined,
  maxSteps: undefined,
  stageName: "readme-demo",
  settings: { timeout: 30_000 },
});

console.log(result.result?.message);
```

### Streaming LLM

```ts
const stream = await llm.stream({
  messages: [{ role: "user", content: "Write a long poem about TypeScript" }],
  identifier: "streaming-demo",
  schema: undefined,
  tools: undefined,
  maxSteps: undefined,
  stageName: "readme-stream",
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}

const finalUsage = await stream.usage;
console.log(`Total tokens: ${finalUsage.inputTokens + finalUsage.outputTokens}`);
```

### Stateful Agent

```ts
import {
  Agent,
  SimpleHistoryCompactor,
} from "@korchasa/ai-skel-ts";

const compactor = new SimpleHistoryCompactor({ maxSymbols: 12_000 });

const agent = new Agent({
  llm,
  mcpClients: undefined,
  ctx,
  systemPrompt: "You are a helpful assistant.",
  compactor,
  tools: undefined,
});

await agent.init();
const reply = await agent.chat("Summarize the main idea of this library.");
console.log(reply);

// Streaming with Agent
for await (const chunk of agent.streamChat("Tell me a joke")) {
  process.stdout.write(chunk);
}
```

### Local Content Fetching

```ts
import { fetchFromURL } from "@korchasa/ai-skel-ts";

const page = await fetchFromURL({
  url: "https://example.com",
  options: {
    ctx,
    contentLimit: 10_000,
  },
});

console.log(page.title, page.textLength);
```

### Jina Fetcher

```ts
import { JinaScraper } from "@korchasa/ai-skel-ts";

const jina = new JinaScraper(ctx, {
  apiKey: Deno.env.get("JINA_API_KEY"),
});

const jinaResult = await jina.fetch("https://example.com");
console.log(jinaResult.text);
```

### Brave Search

```ts
import { BraveSearchClient } from "@korchasa/ai-skel-ts";

const brave = new BraveSearchClient(ctx, {
  apiKey: Deno.env.get("BRAVE_API_KEY"),
});

const search = await brave.search({ q: "TypeScript agent architecture", count: 3 });
console.log(search.web?.results.length ?? 0);
```

## Model URI

`ModelURI.parse()` supports:

- `chat://provider/model` (default interaction mode)
- `response-api://provider/model` (Response API mode)

Examples:

- `chat://openai/gpt-4o`
- `chat://anthropic/claude-3-5-sonnet-latest`
- `chat://gemini/gemini-2.5-pro`
- `chat://openrouter/qwen/qwen2.5-coder-7b-instruct`

URI query parameters map to call settings and provider options.

## Environment Variables

### LLM Providers

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`

### Fetchers

- `JINA_API_KEY`
- `BRAVE_API_KEY`

### Tests

- `ACCEPTANCE_TEST_MODEL` (default: `chat://openrouter/meta-llama/llama-3-8b-instruct`)
- `SKIP_ACCEPTANCE_TESTS=true` to skip provider acceptance tests

## Public API

Root export (`@korchasa/ai-skel-ts`) includes:

- `createLlmRequester`, `ModelURI`
- `Agent`
- `fetch`, `fetchFromURL`
- `JinaScraper`
- `BraveSearchClient`
- `CostTracker`
- `Logger`, `createContextFromLevelString`, `log`
- `SimpleHistoryCompactor`, `SummarizingHistoryCompactor`
- `createRunContext`, `getSubDebugDir`
- Re-exported types: `ModelMessage`, `Tool`, `z`, `ZodError`

Subpath exports are available:

- `@korchasa/ai-skel-ts/llm`
- `@korchasa/ai-skel-ts/agent`
- `@korchasa/ai-skel-ts/fetch-content`
- `@korchasa/ai-skel-ts/jina-scraper`
- `@korchasa/ai-skel-ts/brave-fetcher`
- `@korchasa/ai-skel-ts/cost-tracker`
- `@korchasa/ai-skel-ts/logger`
- `@korchasa/ai-skel-ts/llm-session-compactor`
- `@korchasa/ai-skel-ts/run-context`

## Development

```bash
deno task lint
deno task test
deno task check
deno task release
```

## Testing

Run all tests:

```bash
deno task test
```

Run one test file:

```bash
deno test -A src/llm/llm.test.ts
```

Run acceptance tests (requires `OPENROUTER_API_KEY` unless skipped):

```bash
deno test -A src/llm/llm.acceptance.test.ts
```

## CI/CD

GitHub Actions pipeline (`.github/workflows/ci.yml`) does the following:

1. Runs `deno task check` on pushes and pull requests.
2. Creates release commits and tags on `main` when releasable commits exist.
3. Publishes to JSR.
4. Creates GitHub Release notes from tags.

## AI Context and Usage Rules

This repository is optimized for AI-assisted development.

- Build `RunContext` first and pass it through all core modules.
- Prefer `createLlmRequester` over direct provider SDK usage.
- Use structured schemas (`z.object(...)`) for predictable output.
- Keep debug artifacts enabled (`ctx.debugDir`) for traceability.
- Use `CostTracker` to track cumulative token/cost usage.
- Prefer `Agent.run()` when you need full tool-step and message details.

## License

MIT
