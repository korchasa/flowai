# Reference: Observability Modules — Interfaces

## Logger

```
type LogLevel = "debug" | "info" | "warn" | "error"

// Numeric values for comparison: debug=0, info=1, warn=2, error=3

class Logger
  constructor(params: { context: string; logLevel?: LogLevel })

  debug(message: string, meta?: unknown): void
  info(message: string, meta?: unknown): void
  warn(message: string, meta?: unknown): void
  error(message: string, error?: unknown): void

  private shouldLog(level: LogLevel): boolean
    // LOG_LEVELS[level] >= LOG_LEVELS[this.logLevel]

  private formatMessage(level, message, meta?): string
    // "[{ISO timestamp}] [{LEVEL}] [{context}] {message}{meta}"
    // IMPORTANT: Error objects need explicit extraction (name, message, stack)
    //            because JSON.stringify(new Error("x")) returns "{}"

function createContextFromLevelString(context, level): Logger
  // validates level string, warns and falls back to "debug" if invalid

function log(meta: { mod, event, ...rest }): void
  // global helper: defaultLogger.info("[{mod}] {event}", rest)
```

### LLM Console Log Format

```
[LLM] [run:{runId}] [id:{requestId}:{attempt}] Request: model=..., timeout=...ms
[LLM] [run:{runId}] [id:{requestId}:{attempt}] Response: status=200, duration=...ms, cost=$..., tokens=...
[LLM] [run:{runId}] [id:{requestId}:{attempt}] Error: status=..., error=...
[LLM] [run:{runId}] [id:{requestId}] Completed in N attempts. File: ...
```

---

## Cost Tracker

```
interface CostReport
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  requestCount: number

class CostTracker
  // Pattern: Singleton (getInstance) OR instance (public constructor)

  static getInstance(): CostTracker
  addCost(cost: number): void          // accumulates USD, increments requestCount
  addTokens(input: number, output: number): void
  getReport(): CostReport
  getFormattedReport(): string         // "Total Cost: $X.XXXX\nTotal Tokens: ..."
  reset(): void

  // Integration point: called inside tryGenerate after successful LLM response
  // Cost source: provider metadata (e.g., openrouter.usage.cost) or 0
```

---

## YAML Debug Artifacts

### File location

```
{debugDir}/{stageName}/{ISO-timestamp}-{identifier}-request-response.yaml
```

### Structure

```yaml
id: "{identifier}"
timestamp: "{ISO}"
model: "chat://openai/gpt-4o"
stage: "{stageName}"
settings: { timeout, temperature, ... }
request:
  model: "chat://openai/gpt-4o"
  messages: [{ role, content }]
  response_format: { type: "json_object" }  # if schema
attempts:
  - attempt: 1
    timestamp: "{ISO}"
    response: { status, raw, parsed, steps? }
    stats: { duration, cost, tokens: { input, output, total } }
  - attempt: 2                               # only on retry
    error: "Schema validation failed: ..."
```
