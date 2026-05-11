# Requirements

## Functional Requirements

### LLM Integration (FR-LLM)
- [x] **FR-LLM-1**: Support multiple providers via `ModelURI` class with unified syntax (`provider/model?params`); protocol prefix accepted for backward compatibility but ignored
- [x] **FR-LLM-14**: Unified `createLlmRequester()` factory in `src/llm/factory.ts` routes by provider: `openrouter` → native `@openrouter/sdk`, others → Vercel AI SDK
- [x] **FR-LLM-2**: Implement automatic retry with exponential backoff (default 3 attempts, configurable via `maxValidationRetries` URI parameter)
- [x] **FR-LLM-3**: Support self-correction on JSON parsing/Zod validation failures
- [x] **FR-LLM-4**: Provide structured generation with schema validation and conversational output
- [x] **FR-LLM-5**: Mask sensitive parameters (apiKey) in logging output
- [x] **FR-LLM-6**: Support provider-specific environment variables (`<PROVIDER>_API_KEY`) as API key fallback
- [x] **FR-LLM-7**: Support suppression of Vercel AI SDK internal warnings via `logVercelWarnings=false` URI parameter
- [x] **FR-LLM-8**: Support tool calling and multi-step execution
- [x] **FR-LLM-9**: Return all generated messages (`newMessages`) and detailed execution steps (`steps`) for observability
- [x] **FR-LLM-10**: Support `toolChoice` parameter to control tool calling behavior
- [x] **FR-LLM-11**: Ensure `AbortController.abort()` calls are protected from listener exceptions to prevent process crashes
- [x] **FR-LLM-12**: Support real-time streaming via `LlmRequester.stream` (`LlmStreamer` function) returning `StreamResult<T>` with `textStream`, `fullStream`, and promise-based final values
- [x] **FR-LLM-13**: For structured output streaming, buffer and retry internally (default 3 attempts, configurable via `maxValidationRetries`); consumer receives only the successful attempt's stream
- [x] **FR-LLM-15**: OpenRouter native module supports per-request timeout (default 30s, configurable via `settings.timeout`) using `AbortController` with settled-flag pattern for both non-streaming and streaming paths

### Agent (FR-AGENT)
- [x] **FR-AGENT-1**: Maintain stateful conversation history (`ModelMessage[]`)
- [x] **FR-AGENT-2**: Integrate with MCP clients for tool discovery and execution
- [x] **FR-AGENT-3**: Use history compactor to manage context length
- [x] **FR-AGENT-4**: Support structured logging of agent actions
- [x] **FR-AGENT-5**: Support local tool definition and execution injected directly into the agent
- [x] **FR-AGENT-6**: Provide `run()` method for full access to execution results and `chat()` for simple text output
- [x] **FR-AGENT-7**: Automatically preserve all intermediate tool calls and results in conversation history
- [x] **FR-AGENT-8**: Provide `streamRun()` returning `Promise<StreamResult<unknown>>` and `streamChat()` as `AsyncGenerator<string>` for real-time streaming with automatic history update on completion

### MCP Integration (FR-MCP)
- [x] **FR-MCP-1**: Connect to MCP servers via stdio or SSE
- [x] **FR-MCP-2**: Convert MCP tools to AI SDK compatible formats using `jsonSchema`
- [x] **FR-MCP-3**: Prefix tool names to prevent collisions across multiple servers

### Local Content Processing (FR-LOCAL-CONTENT)
- [x] **FR-LOCAL-CONTENT-1**: Extract clean content from HTML using Mozilla Readability
- [x] **FR-LOCAL-CONTENT-2**: Provide cheerio fallback for Readability failures
- [x] **FR-LOCAL-CONTENT-3**: Extract comprehensive metadata (title, description, author, date, etc.)
- [x] **FR-LOCAL-CONTENT-4**: Sanitize HTML to remove script/style elements
- [x] **FR-LOCAL-CONTENT-5**: Support configurable content length limits
- [x] **FR-LOCAL-CONTENT-6**: Normalize whitespace and handle empty/null fields
- [x] **FR-LOCAL-CONTENT-7**: Suppress irrelevant CSS parsing warnings from JSDOM in stderr

### Jina Scraper (FR-JINA)
- [x] **FR-JINA-1**: Support web search with advanced filtering (site, filetype, intitle, loc)
- [x] **FR-JINA-2**: Provide URL scraping with multiple output formats (markdown, html, text, content)
- [x] **FR-JINA-3**: Support advanced scraping options (CSS selectors, timing controls, image/link retention)
- [x] **FR-JINA-4**: Use separate API endpoints for search (`s.jina.ai`) and reader (`r.jina.ai`)
- [x] **FR-JINA-5**: Provide Bearer token authentication with environment variable fallback
- [x] **FR-JINA-6**: Support markdown formatting options and image alt-text generation

### Brave Search (FR-BRAVE)
- [x] **FR-BRAVE-1**: Support web search with advanced filtering (site, filetype, intitle, freshness)
- [x] **FR-BRAVE-2**: Provide configurable adult content filtering (off/moderate/strict)
- [x] **FR-BRAVE-3**: Include rich metadata in results (thumbnails, profiles, page age)
- [x] **FR-BRAVE-4**: Support country/language preferences and spellcheck
- [x] **FR-BRAVE-5**: Use Bearer token authentication with environment variable fallback
- [x] **FR-BRAVE-6**: Provide debug logging with sensitive header masking
- [x] **FR-BRAVE-7**: Implement automatic 429 (Rate Limit) retry (2 attempts, 1s delay)
- [x] **FR-BRAVE-8**: Support batch search (`searchMany`) with configurable RPS rate limiting

### Session Management (FR-SESSION)
- [x] **FR-SESSION-1**: Compress message history to fit context windows
- [x] **FR-SESSION-2**: Preserve tool-call/tool-result pairing integrity
- [x] **FR-SESSION-3**: Support LLM-powered summarization for history compaction
- [x] **FR-SESSION-4**: Provide simple trimming as fallback option
- [x] **FR-SESSION-5**: Estimate message weight by JSON representation length

### Cost Tracking (FR-COST)
- [x] **FR-COST-1**: Track cumulative token usage (input/output/total)
- [x] **FR-COST-2**: Calculate and accumulate USD costs
- [x] **FR-COST-3**: Provide singleton instance for global cost tracking
- [x] **FR-COST-4**: Generate detailed cost reports per request
- [x] **FR-COST-5**: Accumulate tokens/costs from failed validation attempts during retry loops (non-streaming and streaming)

### Logging (FR-LOG)
- [x] **FR-LOG-1**: Support structured YAML logging for LLM interactions
- [x] **FR-LOG-2**: Include request/response metadata and timing
- [x] **FR-LOG-3**: Provide configurable log levels and contexts
- [x] **FR-LOG-4**: Support debug file output for troubleshooting
- [x] **FR-LOG-5**: Provide string-to-level logger factory with warn + fallback to `debug`
- [x] **FR-LOG-6**: Provide detailed console debug logging for LLM requests/responses with `runId`, request identifier, and file references
- [x] **FR-LOG-7**: Sanitize non-serializable objects (Errors, circular references) in YAML logs to prevent crashes

### Run Context (FR-RUN)
- [x] **FR-RUN-1**: Provide `createRunContext({ logger, debugDir, runId? })`
- [x] **FR-RUN-2**: Require `debugDir` input; use it as the run debug root
- [x] **FR-RUN-3**: Default `runId` is reverse-sortable ISO timestamp with micro suffix
- [x] **FR-RUN-4**: Attach working `saveDebugFile` by default
- [x] **FR-RUN-5**: Support saving complex objects with automatic sanitization (Errors, Buffers, Circular references)

### AI Agent Support (FR-AI)
- [x] **FR-AI-1**: Provide a unified architectural context for AI agents within the `README.md`
- [ ] **FR-AI-2**: Include explicit usage rules and anti-patterns for AI-assisted development in `README.md`
- [x] **FR-AI-3**: Provide reference code examples specifically for AI context windows in `README.md`

## Non-Functional Requirements

### Performance (NFR-PERF)
- [ ] **NFR-PERF-1**: Process HTML content < 1MB in < 5 seconds
- [ ] **NFR-PERF-2**: LLM requests complete within provider timeout limits
- [ ] **NFR-PERF-3**: Session compaction scales linearly with message count
- [ ] **NFR-PERF-4**: Memory usage proportional to processed content size

### Reliability (NFR-REL)
- [x] **NFR-REL-1**: Graceful degradation on LLM provider failures
- [ ] **NFR-REL-2**: 99% success rate for content extraction from valid HTML
- [ ] **NFR-REL-3**: No data loss during session compaction
- [x] **NFR-REL-4**: Automatic recovery from transient network errors

### Security (NFR-SEC)
- [x] **NFR-SEC-1**: No sensitive data in logs (apiKey masking)
- [x] **NFR-SEC-2**: HTML structure validation and noisy element removal
- [ ] **NFR-SEC-3**: No arbitrary code execution from processed content
- [ ] **NFR-SEC-4**: Secure handling of malformed input data

### Usability (NFR-USAB)
- [x] **NFR-USAB-1**: TypeScript-first API with full type safety
- [ ] **NFR-USAB-2**: Comprehensive JSDoc documentation
- [x] **NFR-USAB-3**: Intuitive parameter naming and structure
- [ ] **NFR-USAB-4**: Clear error messages with actionable guidance
- [x] **NFR-USAB-5**: Public fetcher method names should be generic (e.g., `fetch`, `fetchFromURL`) when they return complex objects, to avoid misleading names that imply a single data format.

### Compatibility (NFR-COMPAT)
- [ ] **NFR-COMPAT-1**: Node.js runtime support (primary target, ≥20.0.0)
- [x] **NFR-COMPAT-2**: ESM module system with TypeScript declarations
- [x] **NFR-COMPAT-3**: npm package distribution with JSR (jsr.io)
- [x] **NFR-COMPAT-4**: ES2022+ JavaScript features
- [x] **NFR-COMPAT-5**: Support JSR publication for Deno/Web ecosystem compatibility with automatic version synchronization from `package.json` to `deno.json` in CI.

### Maintainability (NFR-MAINT)
- [x] **NFR-MAINT-1**: Modular architecture with clear separation of concerns
- [ ] **NFR-MAINT-2**: Comprehensive test coverage (>80%)
- [x] **NFR-MAINT-3**: Consistent code formatting and linting
- [x] **NFR-MAINT-4**: Semantic versioning with breaking change indicators
- [x] **NFR-MAINT-5**: Automation tasks must be defined in `deno.json` with one script per task in `scripts/`
