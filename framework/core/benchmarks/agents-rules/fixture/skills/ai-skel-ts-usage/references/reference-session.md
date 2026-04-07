# Reference: Session Management — Interfaces

## Session Compactor

### Interface

```
interface HistoryCompactor
  compact(messages: Message[]): Promise<Message[]> | Message[]
  estimateSymbols(message: Message): number
```

### Symbol Estimation

```
function estimateSymbols(message): number
  // string content → content.length
  // other → JSON.stringify(content).length
  // error → 0
```

### Tool-Call/Tool-Result Consistency

```
function ensureToolConsistency(messages: Message[]): Message[]
  // Pass 1: collect all toolCallIds from tool-call parts and tool-result parts
  // Pass 2: filter out messages where ANY tool part is orphaned
  //   - assistant message with tool-call whose ID has no matching tool-result → remove
  //   - tool message with tool-result whose ID has no matching tool-call → remove
  //   - non-tool messages → keep

  // Type guards:
  //   isToolCallPart(part): part.type === "tool-call" && typeof part.toolCallId === "string"
  //   isToolResultPart(part): part.type === "tool-result" && typeof part.toolCallId === "string"
```

### SimpleHistoryCompactor

```
class SimpleHistoryCompactor implements HistoryCompactor
  constructor(params: { maxSymbols: number })

  compact(messages): Message[]
    // 1. trimBySymbolLimit: iterate from NEWEST to oldest,
    //    accumulate weight, stop when budget exceeded
    // 2. ensureToolConsistency on result

  private trimBySymbolLimit(messages): Message[]
    // for i = length-1 downto 0:
    //   if total + len > maxSymbols:
    //     if already have messages → break
    //     else → skip (single message too large)
    //   prepend to result, total += len
```

### SummarizingHistoryCompactor

```
class SummarizingHistoryCompactor implements HistoryCompactor
  constructor(params: {
    maxSymbols: number
    summaryTokenThreshold?: number    // tokens, not symbols
    summaryGenerator: SummaryGenerator
  })

  async compact(messages): Promise<Message[]>
    // no threshold → delegate to SimpleHistoryCompactor
    // estimate tokens = sum(estimateSymbols / 4)
    // under threshold → delegate to SimpleHistoryCompactor
    // over threshold → try summarizeAndCompact, on error → fallback to simple

  private async summarizeAndCompact(messages): Promise<Message[]>
    // find split: keep last user-assistant exchange
    // toSummarize = messages[0..splitPoint]
    // toKeep = messages[splitPoint..]
    // summary = await summaryGenerator.generateSummary(toSummarize)
    // ensure message alternation (add dummy user message if needed)
    // apply ensureToolConsistency
```

### SummaryGenerator

```
class SummaryGenerator
  constructor(params: { model: LanguageModel; config?: SummaryGeneratorConfig })

  generateSummary(params: { messages: Message[] }): Message
    // Current: concatenates message contents
    // Planned: async, calls LLM with "summarize this conversation" prompt

interface SummaryGeneratorConfig
  summaryMaxTokens?: number
  temperature?: number    // default 0.3
```

---

## MCP Client

```
type McpServerConfig =
  | { type: "stdio"; command: string; args?: string[]; env?: Record<string, string> }
  | { type: "sse"; url: string }

class McpClientWrapper
  constructor(config: McpServerConfig, logger: Logger, name: string)
    // creates transport (Stdio or SSE) and MCP Client instance

  async connect(): Promise<void>
    // idempotent (skips if already connected)

  async disconnect(): Promise<void>
    // errors logged but not thrown (graceful cleanup)

  async getTools(): Promise<Record<string, Tool>>
    // throws if not connected
    // calls MCP "tools/list"
    // for each tool:
    //   name = "{serverName}__{toolName}"     ← NAMESPACING
    //   inputSchema = jsonSchema(tool.inputSchema)
    //   execute = calls MCP "tools/call", extracts text content parts
```
