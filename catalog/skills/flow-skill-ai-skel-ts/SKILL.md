---
name: flow-skill-ai-skel-ts
description: Scaffold a complete AI agent application skeleton with LLM integration, tool calling, observability, cost tracking, session management, and content fetching. Use when the user asks to create an AI agent, add LLM integration, scaffold an AI application, or mentions "ai-skel", "agent skeleton", or "AI scaffold". Works with any programming language.
---

# AI Agent Scaffold

Generates a production-grade AI agent skeleton directly in the target project. The scaffold follows battle-tested patterns from the [ai-skel-ts](https://github.com/korchasa/ai-skel-ts) reference implementation.

## When to Use

- User asks to create a new AI agent or AI-powered application
- User asks to add LLM integration to an existing project
- User mentions "scaffold", "skeleton", "ai-skel", or "agent framework"

## Architecture Overview

The skeleton consists of 10 modules organized into 4 layers:

```
┌─────────────────────────────────────────────────┐
│                   Agent Layer                    │
│  Agent (stateful conversation + tool dispatch)   │
├──────────────┬──────────────┬───────────────────┤
│  LLM Layer   │  Tools Layer │  Session Layer    │
│  LLM Request │  MCP Client  │  History Compact  │
│  (retry,     │  (protocol   │  (trim or         │
│   validate,  │   bridge,    │   summarize,      │
│   observe)   │   namespace) │   tool-pair       │
│              │              │   consistency)    │
├──────────────┴──────────────┴───────────────────┤
│              Observability Layer                 │
│  Logger │ Cost Tracker │ Run Context │ Debug I/O │
├─────────────────────────────────────────────────┤
│              Content Layer                       │
│  Local Fetcher │ Brave Search │ Jina Scraper    │
└─────────────────────────────────────────────────┘
```

## Scaffold Workflow

When generating the scaffold, follow these steps:

### Step 1: Detect Project Context

1. Identify the target programming language and runtime
2. Identify the package manager and dependency management approach
3. Identify existing project structure conventions (src/, lib/, internal/, etc.)
4. Determine which LLM SDK is appropriate for the language:
   - **TypeScript/JavaScript**: Vercel AI SDK (`ai` package)
   - **Python**: `openai`, `anthropic`, `google-generativeai`, or `litellm`
   - **Go**: `github.com/sashabaranov/go-openai` or provider SDKs
   - **Rust**: `async-openai` or provider SDKs
   - **Other**: use the provider's HTTP API directly

### Step 2: Generate Modules Bottom-Up

Generate modules in this order (each depends only on previously generated ones):

1. **Logger** — zero dependencies
2. **Cost Tracker** — depends on Logger
3. **Run Context** — depends on Logger
4. **LLM Requester** — depends on Logger, Cost Tracker, Run Context
5. **Session Compactor** — depends on Logger
6. **MCP Client** — depends on Logger (optional, skip if not needed)
7. **Agent** — depends on LLM Requester, Session Compactor, MCP Client, Run Context
8. **Fetchers** — depends on Run Context (optional, add as needed)

### Step 3: Add Tests

For each module, generate at minimum:
- Unit tests with mocked dependencies
- One integration-style test with real interfaces (but mocked HTTP/LLM)

### Step 4: Wire Entry Point

Create a main entry point (mod.ts / main.py / main.go / etc.) that re-exports public API.

## Module Specifications

Each module below includes: purpose, key interfaces, algorithm, and critical implementation details. For full reference implementations in TypeScript, see the reference files.

---

### 1. Logger

**Purpose**: Structured logging with levels, context, and timestamps.

**Interface**:
- Constructor: `(context: string, logLevel: "debug"|"info"|"warn"|"error")`
- Methods: `debug(msg, meta?)`, `info(msg, meta?)`, `warn(msg, meta?)`, `error(msg, error?)`
- Factory: `createFromLevelString(context, levelString)` — validates level, warns and falls back to "debug"

**Algorithm**: Compare numeric level values (debug=0, info=1, warn=2, error=3). Log only if message level >= configured level.

**Key detail**: Error objects need special serialization (JSON.stringify(Error) returns "{}"). Extract name, message, stack explicitly.

Reference: [reference-observability.md](reference-observability.md)

---

### 2. Cost Tracker

**Purpose**: Accumulate LLM token usage and costs across requests.

**Interface**:
- `addCost(cost: number)` — adds USD cost, increments request counter
- `addTokens(inputTokens, outputTokens)` — accumulates token counts
- `getReport()` → `{totalCost, totalInputTokens, totalOutputTokens, totalTokens, requestCount}`
- `getFormattedReport()` → human-readable string
- `reset()` — zeroes all counters

**Pattern**: Singleton (for global tracking) OR instance (for per-run tracking). Provide both options.

Reference: [reference-observability.md](reference-observability.md)

---

### 3. Run Context

**Purpose**: Immutable execution context with unique run ID and debug artifact management.

**Interface**:
- `RunContext { runId, debugDir, logger, startTime, saveDebugFile() }`
- Factory: `createRunContext(logger, debugDir, runId?)` — auto-generates reverse-sortable ID if not provided
- `getSubDebugDir(ctx, stageDir)` — returns subdirectory path for a stage
- `safeSanitize(obj)` — recursively handles Error, Buffer, circular refs for serialization

**Critical algorithm** — Reverse-sortable Run ID:
```
maxMs = Date.UTC(9999, 11, 31, 23, 59, 59, 999)
reversedMs = maxMs - Date.now()
runId = toISO(reversedMs) + microSequence
```
This makes newest runs sort first in file listings.

Reference: [reference-core.md](reference-core.md)

---

### 4. LLM Requester

**Purpose**: Provider-agnostic LLM interface with retry, validation, self-correction, and observability.

**This is the most complex module.** Read [reference-core.md](reference-core.md) carefully.

**Interface**:
- `ModelURI` — parses `protocol://provider/model?params` (e.g., `chat://openai/gpt-4o?timeout=60000`)
- `createLlmRequester(modelUri, logger, costTracker, ctx)` → requester function
- Requester function: `(messages, identifier, schema?, tools?, maxSteps?, stageName, settings?) → GenerateResult`
- `GenerateResult { result, text, toolCalls, toolResults, newMessages, steps, estimatedCost, inputTokens, outputTokens, validationError?, rawResponse? }`

**Core algorithm** (retry loop with self-correction):
```
parse URI → create provider instance → return requester function

requester(messages, schema, tools, ...):
  write initial YAML log file
  for attempt = 1..MAX_RETRIES(3):
    set timeout via AbortController
    call LLM SDK (generateText / chat completion)
    
    on success:
      track cost/tokens
      aggregate newMessages from steps
      update YAML log
      return result
    
    on validation error (schema mismatch):
      append assistant message (raw response)
      append user message (error description)  ← SELF-CORRECTION
      update YAML log
      retry
    
    on fatal API error (401/403/400):
      return error immediately (no retry)
    
    on transient error:
      exponential backoff: delay = 1000ms * 2^(attempt-1) + jitter(20%)
      retry
```

**Key details**:
- API key resolution: URI param > environment variable (`{PROVIDER}_API_KEY`)
- AbortController.abort() must be wrapped in try-catch (listeners can throw)
- Mask apiKey in URI toString() for logging
- Settings from URI are defaults; per-request settings override them

Reference: [reference-core.md](reference-core.md)

---

### 5. Session Compactor

**Purpose**: Manage conversation context window by trimming or summarizing history.

**Interface**:
- `HistoryCompactor { compact(messages) → messages, estimateSymbols(message) → number }`
- `SimpleHistoryCompactor(maxSymbols)` — trims oldest messages
- `SummarizingHistoryCompactor(maxSymbols, summaryTokenThreshold, summaryGenerator)` — LLM-powered

**Algorithm** (SimpleHistoryCompactor):
```
trimBySymbolLimit:
  iterate messages from newest to oldest
  accumulate symbol weight (JSON.stringify length)
  stop when budget exceeded
  
ensureToolConsistency:
  collect all tool-call IDs and tool-result IDs
  remove messages with orphaned tool-calls (no matching result)
  remove messages with orphaned tool-results (no matching call)
```

**Algorithm** (SummarizingHistoryCompactor):
```
estimate token count (symbols / 4)
if under threshold → delegate to SimpleHistoryCompactor
if over threshold:
  split: messages[0..splitPoint] → summarize, messages[splitPoint..] → keep
  splitPoint = index before last assistant message
  call SummaryGenerator.generateSummary(toSummarize) → summary message
  ensure proper message alternation (add dummy user message if needed)
  apply tool consistency check
on error → fallback to SimpleHistoryCompactor
```

Reference: [reference-session.md](reference-session.md)

---

### 6. MCP Client (optional)

**Purpose**: Bridge between Model Context Protocol servers and the LLM tool interface.

**Interface**:
- `McpClientWrapper(config, logger, name)` — config is either `{type:"stdio", command, args}` or `{type:"sse", url}`
- `connect()` / `disconnect()` — lifecycle management
- `getTools()` → `Record<string, Tool>` — discovers and converts tools

**Key details**:
- Tool namespacing: prefix tool names with server name (`serverName__toolName`) to prevent collisions
- Tool conversion: MCP JSON Schema → LLM SDK Tool format (use `jsonSchema()` helper if available)
- Execute: call MCP `tools/call`, extract text content from response parts

Reference: [reference-session.md](reference-session.md)

---

### 7. Agent

**Purpose**: Stateful conversation runner with tool integration and history management.

**Interface**:
- `Agent(llm, mcpClients?, ctx, systemPrompt?, compactor?, tools?)`
- `init()` — connects MCP clients, aggregates all tools
- `run(input)` → `GenerateResult` — full access to results
- `chat(input)` → `string` — convenience wrapper
- `getHistory()` → messages array

**Algorithm**:
```
constructor:
  store params
  if systemPrompt: push system message to history

init:
  for each mcpClient:
    connect()
    getTools() → merge into this.tools

run(input):
  push user message to history
  if compactor: compact history
  call llm(messages, tools, maxSteps=10, ...)
  if error: throw
  append all newMessages to history
  return result

chat(input):
  return run(input).text
```

Reference: [reference-core.md](reference-core.md)

---

### 8-10. Fetchers (optional)

Three content acquisition strategies. Add only what the project needs.

**Local Fetcher**: HTML → clean text + metadata via Readability algorithm
**Brave Search**: REST API client with 429 retry and rate-limited batch search
**Jina Scraper**: Dual-endpoint (search + reader) API client with rich options

Reference: [reference-fetchers.md](reference-fetchers.md)

---

## Language Adaptation Guidelines

When adapting patterns to a target language:

| Concept | TypeScript | Python | Go | Rust |
|---------|-----------|--------|-----|------|
| Interfaces | `interface` / `type` | `Protocol` / `ABC` | `interface` | `trait` |
| Generics | `<T>` | `Generic[T]` | `[T any]` | `<T>` |
| Async | `async/await` | `async/await` | goroutines/channels | `async/await` |
| Error handling | try/catch + types | try/except + types | error return | Result<T, E> |
| Dependency injection | constructor params | constructor / `__init__` | struct fields | struct fields |
| Singleton | static instance | module-level / `__new__` | `sync.Once` | `once_cell::Lazy` |
| Schema validation | Zod | Pydantic | struct tags + validator | serde + validator |
| URI parsing | `URL` class | `urllib.parse` | `net/url` | `url` crate |

## File Organization

Adapt to the project's conventions. Suggested structure:

```
{src_dir}/
├── agent/
│   ├── agent.{ext}
│   └── agent_test.{ext}
├── llm/
│   ├── requester.{ext}
│   ├── model_uri.{ext}
│   └── requester_test.{ext}
├── run_context/
│   ├── context.{ext}
│   └── context_test.{ext}
├── cost_tracker/
│   ├── tracker.{ext}
│   └── tracker_test.{ext}
├── logger/
│   ├── logger.{ext}
│   └── logger_test.{ext}
├── session/
│   ├── compactor.{ext}
│   ├── summary_generator.{ext}
│   └── compactor_test.{ext}
├── mcp/                          # optional
│   └── client.{ext}
├── fetchers/                     # optional
│   ├── local/
│   ├── brave/
│   └── jina/
└── mod.{ext}                     # public API entry point
```

## Critical Rules

1. **No stubs**: Every function must have a real implementation
2. **Observability first**: Every LLM call writes a YAML debug artifact to debugDir
3. **Self-correction**: On schema validation failure, feed the error back to the LLM
4. **Tool-pair consistency**: Never leave orphaned tool-calls or tool-results in history
5. **Reverse-sortable IDs**: Run IDs sort newest-first in file listings
6. **Mask secrets**: API keys must never appear in logs or debug files
7. **Exponential backoff**: `delay = baseDelay * 2^(attempt-1) + jitter`
8. **Safe serialization**: Handle Error objects, Buffers, circular references before serializing
9. **URI-based config**: Model configuration via `protocol://provider/model?params`
10. **Graceful degradation**: Summarization fails → fall back to trimming; MCP fails → continue without tools

## Checklist

After generating the scaffold, verify:

- [ ] All modules compile/lint without errors
- [ ] Tests pass
- [ ] LLM Requester has retry loop with self-correction
- [ ] Agent preserves all intermediate tool-call messages in history
- [ ] Session Compactor maintains tool-call/tool-result pair consistency
- [ ] Run Context generates reverse-sortable IDs
- [ ] Logger handles Error serialization
- [ ] Cost Tracker accumulates across requests
- [ ] Debug artifacts written as YAML to structured directories
- [ ] API keys masked in all log output
