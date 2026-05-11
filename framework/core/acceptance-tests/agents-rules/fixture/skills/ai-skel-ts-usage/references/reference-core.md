# Reference: Core Modules — Interfaces

## LLM Requester

### ModelURI

```
class ModelURI
  static parse(uri: string): ModelURI
    // "openai/gpt-4" → "chat://openai/gpt-4" (default protocol)
    // Validates: host (provider) required, pathname (model) required

  get protocol(): string   // "chat"
  get provider(): string   // "openai"
  get modelName(): string  // "gpt-4" or "meta-llama/llama-3" (can contain slashes)
  get params(): URLSearchParams
  toString(): string       // apiKey masked as "***"
```

### URI Parameter Extraction

```
function parseModelUri(uri: ModelURI): ParsedModelUri

interface ParsedModelUri
  protocol: string
  provider: string
  modelName: string
  apiKey?: string          // URI param > env {PROVIDER_UPPERCASE}_API_KEY
  baseURL?: string
  params: Record<string, string>
  settings: LlmSettings    // numeric params: maxTokens, temperature, topP, topK,
                           // frequencyPenalty, presencePenalty, seed, maxRetries, timeout
                           // string param: stop (comma-separated → array)
```

### Provider Factory

```
function createModelInstance(parsed: ParsedModelUri): LanguageModel
  // Maps provider name → SDK instance:
  // "openai"     → createOpenAI({ apiKey, baseURL }).chat(modelName)
  // "anthropic"  → createAnthropic({ apiKey })(modelName)
  // "gemini"     → createGoogleGenerativeAI({ apiKey })(modelName)
  // "openrouter" → createOpenRouter({ apiKey }).chat(modelName)
```

### LLM Requester Factory

```
function createLlmRequester(params: LlmRequesterParams): LlmRequester

interface LlmRequesterParams
  modelUri: ModelURI
  logger: Logger
  costTracker: CostTracker
  ctx: RunContext

type LlmRequester = <T>(params: {
  messages: Message[]
  identifier: string
  schema: ZodType<T> | undefined     // structured output
  tools: Record<string, Tool> | undefined
  maxSteps: number | undefined
  stageName: string                  // debug subdirectory name
  settings: LlmSettings | undefined // overrides URI defaults
}) => Promise<GenerateResult<T>>

type LlmSettings = CallSettings & {
  timeout?: number        // per-attempt, default 30000ms
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'tool'; toolName: string }
}
```

### GenerateResult

```
interface GenerateResult<T>
  result: T | null              // structured output (if schema provided)
  text?: string                 // raw text output
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  newMessages: Message[]        // ALL intermediate messages for history
  steps: Step[]                 // detailed execution steps
  estimatedCost: number         // USD
  inputTokens: number
  outputTokens: number
  validationError?: string      // set if attempt failed
  rawResponse?: string          // raw LLM text for self-correction
```

### Core Algorithm: Retry with Self-Correction

```
createLlmRequester:
  parse URI → create model instance → return requester function

requester(messages, schema, tools, ...):
  mergedSettings = { ...uriDefaults, ...perRequestSettings }
  write initial YAML log to {debugDir}/{stageName}/

  for attempt = 1..3:
    result = tryGenerate(...)
    append logAttempt to YAML file

    if no validationError → return result
    if "Fatal API Error" (401/403/400) → return immediately

    // SELF-CORRECTION:
    messages.push({ role: "assistant", content: rawResponse || "Invalid response" })
    messages.push({ role: "user", content: validationError })

    if last attempt → return result
    sleep(1000ms * 2^(attempt-1) + 20% jitter)

tryGenerate:
  AbortController with timeout (try-catch on abort() — listeners can throw)
  generateText({ model, output, messages, tools, toolChoice, stopWhen, abortSignal })
  track cost/tokens via costTracker
  aggregate newMessages from steps (tool-calls + tool-results)

  Error classification:
    NoObjectGeneratedError → schema mismatch (has raw text, status 200)
    TypeValidationError    → JSON doesn't match schema
    JSONParseError         → invalid JSON
    APICallError           → provider HTTP error
    AbortError             → timeout
    401/403/400            → Fatal (no retry)
```

---

## Run Context

```
interface RunContext
  readonly runId: string
  readonly debugDir: string
  readonly logger: Logger
  readonly startTime: Date
  saveDebugFile?(params: { filename: string; content: string | unknown; stageDir?: string }): Promise<void>

function createRunContext(logger, debugDir, runId?): RunContext
  // runId default: reverse-sortable ISO timestamp (newest sorts first)
  // saveDebugFile: mkdir + safeSanitize + writeFile

function getSubDebugDir(ctx, stageDir): string
  // returns join(ctx.debugDir, stageDir)

function createRunId(): string
  // reversedMs = Date.UTC(9999,11,31,...) - Date.now()
  // + microsecond sequence for same-ms uniqueness
  // Result: "7973-11-27T08:36:12.456999Z"

function safeSanitize(obj, visited?): unknown
  // Handles: null, primitives → passthrough
  //          circular refs → "[Circular Reference]"
  //          Error → { name, message, stack, ...rest }
  //          Buffer → "[Buffer: N bytes]"
  //          Array → map recursively
  //          Object → entries recursively
```

---

## Agent

```
interface AgentParams
  llm: LlmRequester                          // required
  mcpClients: McpClientWrapper[] | undefined  // explicit undefined, not optional
  ctx: RunContext                             // required
  systemPrompt: string | undefined
  compactor: HistoryCompactor | undefined
  tools: Record<string, Tool> | undefined

class Agent
  private messages: Message[] = []
  private tools: Record<string, Tool> = {}

  constructor(params: AgentParams)
    // if systemPrompt → push system message to history

  async init(): Promise<void>
    // for each mcpClient: connect() → getTools() → merge into this.tools

  async run(input: string): Promise<GenerateResult>
    // 1. push user message
    // 2. compact history (if compactor)
    // 3. call llm(messages, tools, maxSteps=10, ...)
    // 4. throw on validationError
    // 5. append ALL newMessages to history (preserves tool-call chain)
    // 6. return response

  async chat(input: string): Promise<string>
    // return run(input).text ?? ""

  getHistory(): Message[]
    // return copy of messages
```
