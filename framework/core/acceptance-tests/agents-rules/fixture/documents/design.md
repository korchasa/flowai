# Design

## Architecture Overview

```mermaid
graph TD
    A[mod.ts] --> B[LLM Module]
    A --> NR[OpenRouter Native Module]
    A --> C[Fetchers]
    A --> D[Cost Tracker]
    A --> E[Logger]
    A --> F[Session Compactor]
    A --> G[Run Context]
    A --> H[Jina Scraper]
    A --> S[Agent]

    B --> I[Vercel AI SDK]
    B --> J[Zod Validation]

    NR --> OR[@openrouter/sdk]
    NR --> J

    S --> B
    S --> NR
    S --> T[MCP Client]
    S --> F

    C --> K[Local Fetcher]
    C --> L[Jina Fetcher]
    C --> M[Brave Search]

    K --> M[Mozilla Readability]
    K --> N[Metascraper]
    K --> O[Cheerio]

    L --> P[Jina Reader API]
    L --> Q[Jina Search API]

    F --> R[Summary Generator]
    R --> B

```

## Core Modules

### OpenRouter Native Module (`src/openrouter/`)

**Purpose**: Direct OpenRouter API integration using `@openrouter/sdk@0.8.0`, bypassing the Vercel AI SDK abstraction layer while producing the same `GenerateResult<T>` interface.

**Key Components**:

- `createOpenRouterRequester()`: Factory returning `LlmRequester`-compatible function
- `convertToOrMessages()`: Converts Vercel AI SDK `ModelMessage[]` → OpenRouter `Message[]` (supports v6 `input`/`output` and legacy v5 `args`/`result` formats)
- `convertToOrTools()`: Converts Vercel AI SDK `Record<string, Tool>` → OpenRouter `ToolDefinitionJson[]` (Chat Completions format, kept for backward compat)
- `convertToOrRequestTools()`: Converts tools to OpenResponses API flat format (`{ type, name, parameters }`)
- `OpenRouterEngine`: Interface for HTTP transport (enables mocking in tests); `responseSend` for non-streaming, `streamSend` for streaming — both accept optional `AbortSignal` for timeout control

**Features**:

- Both non-streaming and streaming use the **OpenResponses API** (`client.beta.responses.send({ openResponsesRequest })`)
  - Non-streaming: `responseSend()` with `stream: false` — response includes `usage.cost` for accurate cost tracking
  - Streaming: `.stream` property (`LlmStreamer`) with `stream: true` — SSE events
- Streaming details:
  - Text-only: real-time SSE `response.output_text.delta` chunks forwarded to `textStream`
  - Structured output: buffered internally, validated, replayed on success (same 3-retry pattern)
  - Tool calling: `response.output_item.done` function_call events → execute → loop
  - Usage/cost from `response.completed` event
  - YAML debug file written on completion (success/error) via `saveYamlLog` using `RunContext.saveDebugFile`
- Structured output via Zod schema → JSON Schema → `text.format: { type: "json_schema" }` for both streaming and non-streaming
- Tool calling with automatic execution and multi-step loop (up to `maxSteps`)
  - Tool continuation uses native OpenResponses input format (`function_call` + `function_call_output` items), not Chat Completions message conversion
- Timeout control: per-request timeout (default 30s, configurable via `settings.timeout`) using `AbortController` with settled-flag defense-in-depth pattern (mirrors `llm.ts`). Applied to both `responseSend` (per step call) and `streamSend` (entire stream lifecycle). Signal forwarded to `@openrouter/sdk` via `RequestOptions.signal`.
- Retry logic (3 attempts) with self-correction on JSON parse / Zod validation failures
- CostTracker, Logger, RunContext integration (cost extracted from `usage.cost` in API response)
- Backward compatible with messages from `createVercelRequester`

**SDK API note**: SDK v0.8.0 (used by Deno) requires `{ openResponsesRequest: request }` wrapper for `client.beta.responses.send()`. The `chatSend` method on `OpenRouterEngine` is deprecated; `responseSend` is used for non-streaming requests.

**URI format**: `openrouter/<provider>/<model>?apiKey=...`
Example: `openrouter/openai/gpt-4o`, `openrouter/meta-llama/llama-3.1-8b-instruct`

**Environment variable**: `OPENROUTER_API_KEY`

---

### LLM Module (`src/llm/`)

**Purpose**: Unified provider-agnostic interface for structured and conversational LLM generation with resilience and tool support.

**Key Components**:

- `createLlmRequester()`: Unified factory that routes by provider — `openrouter` → native `@openrouter/sdk`, all others → Vercel AI SDK. Defined in `src/llm/factory.ts`.
- `ModelURI`: Class encapsulating `URL` for model identifiers
- `LlmRequester`: Type for schema-validated or tool-enabled generation requests
- `LlmSettings`: CallSettings + `timeout` + `toolChoice` ('auto', 'none', 'required', or specific tool)
- URI Parser:
  `ModelURI` class supporting `provider/model` syntax. A protocol prefix (`chat://`, `response-api://`) is accepted for backward compatibility but is ignored.
- Warning Suppression: Global `AI_SDK_LOG_WARNINGS` control via `logVercelWarnings` URI parameter
- Retry Logic: Configurable validation retry count via `maxValidationRetries` URI parameter (default 3), exponential backoff (1s, 2s, 4s). Independent from HTTP-level `maxRetries` (Vercel AI SDK).
- Self-Correction: Retry on validation failures with error context
- Timeout Control: Per-attempt timeout (default 30s) using AbortController. Defense-in-depth against abort/settle race condition: a `settled` flag in the timeout callback skips `abort()` if the promise already settled, and `clearTimeout` in `finally` cancels the timer. Both guards are needed because `clearTimeout` cannot cancel a callback already queued as a macrotask.
- Parameter Support: URI defaults + per-request overrides
- Tool Support: Integration with Vercel AI SDK `Tool` interface and `maxSteps` (via `stopWhen`)
- Observability: Full step-by-step logging of tool calls and results
- **Sanitization**: Automatic `Error` and circular reference sanitization for YAML logging to prevent serialization crashes.

**Provider Support**:

| Provider   | SDK                         | URI Format                          | Environment Variable |
| ---------- | --------------------------- | ----------------------------------- | -------------------- |
| OpenAI     | @ai-sdk/openai              | `openai/gpt-4`                      | `OPENAI_API_KEY`     |
| Anthropic  | @ai-sdk/anthropic           | `anthropic/claude-3`                | `ANTHROPIC_API_KEY`  |
| Gemini     | @ai-sdk/google              | `gemini/gemini-pro`                 | `GEMINI_API_KEY`     |
| OpenRouter | @openrouter/sdk (native)    | `openrouter/openai/gpt-4o`          | `OPENROUTER_API_KEY` |

**Protocol prefix**: optional, ignored. `chat://openai/gpt-4` and `openai/gpt-4` are equivalent.

**API Key Resolution**:

- Priority: URI parameter > Environment variable
- URI format: `provider/model?apiKey=key`
- Environment variables: `<PROVIDER_UPPERCASE>_API_KEY`

**Generation Logic**:

- Uses `generateText` with `Output.object(zodSchema(schema))` for structured output
- Supports `messages: ModelMessage[]` for conversational history
- Supports `tools: Record<string, Tool>` for tool-calling capabilities
- Captures raw LLM response text for logging/debugging
- Handles `NoObjectGeneratedError` for schema validation failures
- Provides results in `GenerateResult` including `text`, `toolCalls`, `toolResults`, `newMessages`, and `steps`
- Supports multi-step execution via `maxSteps` (using `stepCountIs` stop condition)

**Streaming**:

- `LlmRequester.stream` property provides a `LlmStreamer` function for real-time streaming
- Returns `StreamResult<T>` with:
  - `textStream`: `AsyncIterable<string>` — chunks as they arrive
  - `fullStream`: `AsyncIterable<unknown>` — all stream parts (text-delta, tool-call, finish, etc.)
  - Promise-based final values: `text`, `output`, `toolCalls`, `toolResults`, `newMessages`, `steps`, `usage`, `estimatedCost`
- Two modes:
  - **Text-only** (no `schema`): direct streaming, chunks yielded in real time
  - **Structured** (with `schema`): buffered retry loop — stream is consumed internally, validated, and replayed on success; consumer sees only the successful attempt
- CostTracker updated via `usage` promise resolution on every attempt (including failed validations), not only on success
- Max 3 retry attempts for structured output (same as non-streaming path)
- **YAML debug file logging**: Both streaming modes write a YAML debug file on completion (success or error) via `RunContext.saveDebugFile`. Uses the same `YamlLogData`/`YamlLogAttempt` structure as the non-streaming path. `_stageName` parameter determines the stage subdirectory. Structured path logs each retry attempt (validation failures, errors) before the final write. Gracefully skips if `saveDebugFile` is not available on the context.

### Agent Module (`src/agent/`)

**Purpose**: Stateful runner for multi-turn conversations with tool integration and history management.

**Features**:

- **Stateful**: Maintains `ModelMessage[]` history across turns
- **History Preservation**: Automatically captures all intermediate tool calls and results from `LlmRequester`
- **Strict Parameters**: `AgentParams` requires explicit definition of all dependencies (`mcpClients`, `systemPrompt`, `compactor`, `tools`) as `Type | undefined`.
- **API**:
    - `run(input)`: Full turn execution returning `GenerateResult`
    - `chat(input)`: Convenient text-only wrapper around `run()`
    - `streamRun(input)`: Streaming execution returning `Promise<StreamResult<unknown>>`
    - `streamChat(input)`: Async generator yielding text chunks; history updated after completion
- **Tool Integration**: Aggregates tools from multiple sources:
    - **Local Tools**: Direct injection of `Tool` objects via constructor
    - **MCP Integration**: Connects to multiple MCP servers and automatically aggregates tools
- **History Compaction**: Uses `HistoryCompactor` to fit history within context limits
- **Observability**: Structured logging via `RunContext` and `Logger`

### MCP Client (`src/mcp/`)

**Purpose**: Wrapper for Model Context Protocol (MCP) clients to integrate with AI SDK.

**Key Components**:

- `McpClientWrapper`: Manages connection and tool discovery
- **Tool Conversion**: Converts MCP tool definitions to AI SDK `Tool` interface using `jsonSchema()`
- **Namespacing**: Tool names prefixed with server name (`server__tool`) to avoid collisions

### Fetchers (`src/fetchers/`)

**Purpose**: Multiple strategies for content acquisition and processing.

#### Local Fetcher (`src/fetchers/local-fetcher/`)

**Purpose**: Extract clean text content and metadata from web pages using local processing.

**Pipeline**:

1. **Download**: Fetch HTML via configurable downloader
2. **Sanitize**: Fix HTML structure, remove blacklisted tags (`script`, `style`,
   `iframe`, etc.)
3. **Extract**: Mozilla Readability → cheerio fallback. Uses `JSDOM` with a `VirtualConsole` that filters "Could not parse CSS stylesheet" noise.
4. **Metadata**: metascraper for structured data extraction
5. **Normalize**: Trim whitespace, handle nulls

**Extracted Fields**:

- Content: Main article text (configurable limit, normalized whitespace)
- Metadata: title, description, author, date, image, lang, publisher
- URLs: canonical, resolved, media (audio/video)

#### Jina Fetcher (`src/fetchers/jina-fetcher/`)

**Purpose**: Web scraping and search using Jina AI APIs.

**Features**:

- **Search API**: Web search with filtering (site, filetype, intitle, etc.)
- **Reader API**: Content extraction with advanced options (selectors, images,
  links)
- **Dual Endpoints**: Separate URLs for search (`s.jina.ai`) and reader
  (`r.jina.ai`)
- **Rich Options**: Markdown formatting, image/link retention, timeout control

**API Methods**:

- `search()`: Web search with query and filters
- `scrapeUrlToResponse()`: Direct URL scraping via `GET /{url}`
- `scrapeIndexToResponse()`: Advanced scraping via `POST /` with body params
- `fetch()`: Fetch and normalize content from a URL
- `search()`: Search and get normalized content results

### Session Management (`src/llm-session-compactor/`)

**Purpose**: Compress conversation history to fit context windows.

**Compaction Strategies**:

- **SimpleHistoryCompactor**: Trim oldest messages by symbol count
- **SummarizingHistoryCompactor**: LLM-powered summarization with fallback
- **SummaryGenerator**: Uses `LlmRequester` for real LLM calls (retry, YAML debug files, cost tracking). Falls back to degraded summary on error or empty response. Config: `summaryMaxTokens` → `maxOutputTokens`, `temperature`.

**Consistency Rules**:

- Preserve tool-call/tool-result pairs
- Remove orphaned tool calls/results
- Maintain message role sequence
- Estimate weight by JSON.stringify length

### Cost Tracking (`src/cost-tracker/`)

**Purpose**: Monitor LLM usage costs and token consumption.

**Features**:

- Singleton pattern for global tracking
- Provider-agnostic cost calculation
- Cumulative metrics: cost, tokens (input/output/total)
- Request counting and reporting
- Tracks tokens from ALL LLM attempts including failed schema validations:
  - Non-streaming: extracts `usage` from `NoObjectGeneratedError` thrown by Vercel AI SDK
  - Streaming structured: awaits `usage` promise on failed validation before retrying

### Logging (`src/logger/`)

**Purpose**: Structured logging with YAML output for debugging and detailed console output.

**Log Structure**:
Grouped logical request log containing invariant request data and a list of physical attempts.

```yaml
id: "logical-request-id"
timestamp: "2026-01-18T00:00:00.000Z"
model: "chat://openai/gpt-4"
stage: "agent-loop"
settings:
  timeout: 30000
  retries: 3
request:
  model: "chat://openai/gpt-4"
  messages: [...]
  response_format: { type: "json_object" }
attempts:
  - attempt: 1
    timestamp: "..."
    response:
      status: 200
      raw: "..."
      parsed: { ... }
      steps: [...]
    stats:
      duration: 1250
      cost: 0.0123
      tokens: { input: 150, output: 200, total: 350 }
  - attempt: 2
    timestamp: "..."
    error: "Validation failed..."
```

**Console Debug Output**:
LLM interactions produce detailed console logs for traceability:
- `[LLM] [run:id] [id:request:attempt] 🚀 Request: model=..., maxRetries=..., timeout=...ms, attempt=...`
- `[LLM] [run:id] [id:request:attempt] ✅ Response: status=200, duration=...ms, cost=..., tokens=..., finishReason=...`
- `[LLM] [run:id] [id:request:attempt] ❌ Error: status=..., error=...`
- `[LLM] [run:id] [id:request] Completed in X attempts. File: ...`

**Factory**:

- `createContextFromLevelString({ context, level })`: builds `Logger` from
  string level with warn + fallback to `debug`.

### Jina Scraper (`src/fetchers/jina-fetcher/`)

**Purpose**: Unified client for Jina AI search and scraping APIs.

**Key Components**:

- `JinaScraper`: Main client class supporting both search and scraping
- **Search API** (`s.jina.ai`): Web search with advanced filtering
- **Reader API** (`r.jina.ai`): Content extraction with rich options
- **Authentication**: Bearer token with environment variable fallback

**Supported Operations**:

- Web search with site/filetype/intitle filters
- URL scraping with format options (markdown, html, text, content)
- Advanced scraping with CSS selectors and timing controls
- Image/link retention modes and markdown formatting

**Configuration**:

- `searchBaseUrl`: Search API endpoint (default: `https://s.jina.ai`)
- `readerBaseUrl`: Reader API endpoint (default: `https://r.jina.ai`)
- `apiKey`: Authentication token (env: `JINA_API_KEY`)

#### Brave Search (`src/fetchers/brave-fetcher/`)

**Purpose**: Web search using Brave Search API with comprehensive filtering and
structured results.

**Features**:

- **Advanced Search**: Query-based web search with multiple filters (site,
  filetype, freshness, country)
- **Content Control**: Adult content filtering (off/moderate/strict) with
  family-friendly results
- **Rich Metadata**: Results include thumbnails, profiles, page age, and
  structured URLs
- **Global Support**: Country/language preferences with spellcheck capabilities
- **Debug Logging**: Request/response logging with sensitive data masking

**API Methods**:

- `search()`: Web search with comprehensive filtering options and automatic 429
  retries
- `searchMany()`: Batch search with configurable rate limiting (RPS)
- Debug file output for troubleshooting API interactions

**Configuration**:

- `baseUrl`: API endpoint (default: `https://api.search.brave.com/res/v1`)
- `apiKey`: Authentication token (env: `BRAVE_API_KEY`)
- Run context integration for debug file management

### Run Context (`src/run-context/`)

**Purpose**: Standardize per-run metadata and debug I/O.

**Key Components**:

- `createRunContext()`: factory with default reverse-sortable `runId` and wired
  `saveDebugFile`
- `RunContext`: immutable run metadata (runId, debugDir, logger, startTime)
- `getSubDebugDir()`: stage subdirectory resolver
- `saveDebugFile()`: default debug file writer (mkdir + write). Supports `string | unknown` content with automatic `safeSanitize` for non-string objects.
- `safeSanitize()`: Utility for handling `Error`, `Buffer`, and circular references during serialization.

**Behavior**:

- `debugDir` is required input
- `runId` is optional input; default is reverse-chronological ISO timestamp +
  micro suffix

### AI Agent Support (`README.md`)

**Purpose**: Provide unified architectural context and coding rules for AI agents (Cursor, Copilot).

**Features**:
- **Unified Context**: Instructions contained within the main README.
- **Agent Instructions**: Explicit system instructions for LLMs in the "AI Context & Usage Rules" section.
- **Usage Rules**: Strict guidelines for component initialization and error handling.
- **Code Style Examples**: Reference implementations provided in the README.

## Data Flow

### LLM Request Flow

```
URI → Parse → Create Provider → Generate Text with Output.object → Extract Result/Text → Log Raw Response → Retry on Error → Return
```

### Local Fetch Flow

```
URL → Download → Sanitize → Extract Content → Extract Metadata → Normalize → Return
```

### Jina Fetch Flow

```
Query/URL → API Request → Jina Processing → Format Response → Return
```

### Session Compaction Flow

```
Messages → Estimate Weights → Check Limit → Summarize or Trim → Ensure Consistency → Return
```

## Error Handling

### Resilience Patterns

- **Retry**: Exponential backoff for transient failures
- **Fallback**: Alternative extraction methods
- **Graceful Degradation**: Partial results on component failures
- **Validation Recovery**: Self-correction with error context

### Error Types

- `NoObjectGeneratedError`: Schema validation failures (captures raw response)
- `APICallError`: Provider API failures
- `TypeValidationError`: Zod schema violations
- `JSONParseError`: Response parsing failures
- `AbortError`: Request timeout (mapped to "Request timed out" validation error)

## Type Safety

### Core Types

```typescript
export interface GenerateResult<T> {
  readonly result: T | null;
  readonly text?: string;
  readonly toolCalls?: Array<{ toolCallId: string; toolName: string; args: any }>;
  readonly toolResults?: Array<{ toolCallId: string; toolName: string; args: any; result: any }>;
  readonly newMessages: ModelMessage[];
  readonly steps: any[];
  readonly estimatedCost: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly validationError?: string;
  readonly rawResponse?: string;
}

export type LlmRequester = (<T>(params: {
  messages: ModelMessage[];
  identifier: string;
  schema: z.ZodType<T> | undefined;
  tools: Record<string, Tool> | undefined;
  maxSteps: number | undefined;
  stageName: string;
  settings: LlmSettings | undefined;
}) => Promise<GenerateResult<T>>) & {
  /** Exposes the underlying LlmEngine for testing/mocking. */
  engine?: LlmEngine;
  /** Streaming counterpart — returns StreamResult instead of awaiting full generation. */
  stream: LlmStreamer;
};
```

### Export Strategy

- **mod.ts**: Public API surface. Re-exports core components (`LlmRequester`, `Agent`, `Logger`, `RunContext`, `CostTracker`) and critical dependencies (`z` from `zod`, `ModelMessage` and `Tool` from `ai`) to ensure type compatibility and version consistency for consumers.
- **Submodule exports**: `llm/`, `fetch-content/`, etc.
- **Type-only exports**: Zod schemas and utility types

## Testing Strategy

### Test Coverage

- **Unit**: component logic
- **Integration**: provider flows
- **E2E**: full content pipeline
- **Acceptance**: real API contract verification
- **Filesystem**: debug file writing and directory creation

### Test Organization

```
src/
├── *.test.ts                      # Unit tests
├── */*.integration.test.ts        # Integration tests
├── llm/llm.acceptance.test.ts     # Acceptance tests
├── llm/llm.abort-crash.test.ts    # AbortController crash resilience tests
├── llm/llm.raw-response.test.ts   # Raw response logging tests
└── fetch-content/
    └── fetch-content.e2e.test.ts   # E2E tests
```

## Build & Distribution

### Node.js Configuration

```json
{
  "name": "@korchasa/ai-skel-ts",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/mod.d.ts",
      "import": "./dist/mod.js"
    },
    "./llm": {
      "types": "./dist/llm.d.ts",
      "import": "./dist/llm.js"
    },
    "./fetch-content": {
      "types": "./dist/fetch-content.d.ts",
      "import": "./dist/fetch-content.js"
    },
    "./jina-scraper": {
      "types": "./dist/jina-scraper.d.ts",
      "import": "./dist/jina-scraper.js"
    },
    "./cost-tracker": {
      "types": "./dist/cost-tracker.d.ts",
      "import": "./dist/cost-tracker.js"
    },
    "./logger": {
      "types": "./dist/logger.d.ts",
      "import": "./dist/logger.js"
    },
    "./llm-session-compactor": {
      "types": "./dist/llm-session-compactor.d.ts",
      "import": "./dist/llm-session-compactor.js"
    },
    "./run-context": {
      "types": "./dist/run-context.d.ts",
      "import": "./dist/run-context.js"
    }
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "lint": "eslint --max-warnings=0 src/**/*.ts",
    "check": "npm run lint && npm test && npm run build"
  }
}
```

### Build Pipeline

- **TypeScript Compilation**: ES2022 target with NodeNext modules
- **Bundling**: tsup for ESM distribution with source maps
- **Type Definitions**: Generated .d.ts files for TypeScript consumers
- **Linting**: ESLint with TypeScript rules and zero warnings
- **Testing**: Vitest with comprehensive test coverage
- **Versioning**: Automated via `standard-version` configured for `deno.json` (see `.versionrc.json`).

### Task Automation

- **Deno Tasks**: Root `deno.json` maps automation commands to scripts in `scripts/`
- **Script Layout**: One task per file (`scripts/task-*.ts`) with shared helpers in `scripts/utils.ts`
- **Commands**: `check`, `test`, `build`, `release` tasks shell out to npm workflows. `release` task uses `standard-version` to bump version in `deno.json`.
- **Git Hooks**: `hooks/pre-commit` runs `deno task check`

### CI/CD Pipeline

- **GitHub Actions**: automated checks on push/PR
- **Node.js 20**: runtime with npm cache
- **Quality Gates**: ESLint (zero warnings), Vitest, TypeScript compilation
- **Distribution**: npm (GitHub Packages) and JSR (jsr.io) publish flow with automatic version sync to `deno.json`.

### Package Management

- **npm & JSR**: Primary registries with GitHub Packages and JSR.io support
- **Dependencies**: Node.js ecosystem with Vercel AI SDK
- **Engine Requirements**: Node.js ≥20.0.0
- **Distribution**: ESM modules with dual type/import exports and JSR source distribution
