# Vision

## Purpose
AI Skeleton Tools (ai-skel-ts) provides robust TypeScript foundation for AI-powered applications requiring reliable LLM interactions and web content processing, built for Node.js ecosystem.

## Value Proposition

### Unified LLM Interface
- **Provider Agnostic**: Single URI-based interface supporting OpenAI, Anthropic, Gemini, OpenRouter
- **Agent Ready**: Multi-step execution with tool-calling support and `toolChoice` control
- **History Preservation**: Native return of all session messages (`newMessages`) for stateful systems
- **Environment Config**: Provider-specific environment variables (`<PROVIDER>_API_KEY`) with URI parameter priority
- **Enhanced Resilience**: Configurable validation retry count (default 3, via `maxValidationRetries` URI parameter) with exponential backoff and raw response capture for self-correction
- **Cost Transparency**: Real-time token usage and USD cost tracking
- **Type Safety**: Zod/JSON schema validation with comprehensive error logging
- **Deep Observability**: Step-by-step execution traces in debug logs

### Agent Framework
- **Stateful Interaction**: Multi-turn conversation management
- **Tool Aggregation**: Seamless integration with local tools and Model Context Protocol (MCP) servers
- **Context Awareness**: Integrated history compaction and summarization
- **Observable Runs**: Structured logging of all agent steps

### Content Processing
- **Smart Content Extraction**: Mozilla Readability + cheerio fallback for clean text and HTML content
- **Rich Metadata**: Structured extraction of title, author, date, images, media
- **Sanitization**: HTML cleaning to safe, readable formats
- **Flexible Fetching**: Generic `fetch`/`fetchFromURL` interface with configurable limits

### Brave Search
- **Web Search API**: Comprehensive search with advanced filtering (site, filetype, freshness)
- **Rich Results**: Structured data including thumbnails, profiles, metadata
- **Content Safety**: Configurable adult content filtering (off/moderate/strict)
- **Global Coverage**: Country/language preferences with spellcheck support
- **Resilient Batching**: 429 retry logic and rate-limited batch search (`searchMany`)

### Jina Scraper
- **Dual API Support**: Search and reader APIs with unified interface
- **Advanced Scraping**: CSS selectors, timing controls, format options
- **Web Search**: Site/filetype filtering with rich metadata
- **Content Formats**: Markdown, HTML, text, structured content extraction
- **Authentication**: Secure API key management with environment variables

### Session Management
- **Context Optimization**: LLM-powered history compaction to fit context windows
- **Consistency Preservation**: Tool-call/tool-result pairing integrity during trimming
- **Adaptive Summarization**: Intelligent compression with message count indication

### Run Context
- **Deterministic Runs**: Standard factory with reverse-sortable run IDs
- **Debug Artifacts**: Default debug file writer with structured directories
- **Traceability**: Stable run metadata (runId, startTime, debugDir, logger)

### Logging
- **Config-Friendly Levels**: Factory accepts string log level with safe fallback
- **Traceable Interactions**: Detailed debug logging of LLM requests and responses with run and file context

### AI-Assisted Development
- **Context-First**: Native support for AI agents through explicit architectural context in `README.md`
- **Optimized for Cursor**: Pre-configured rules for seamless AI pair programming integrated into the project's primary documentation

## Target Applications
- AI content analysis tools
- Conversational AI agents
- Web scraping with LLM processing
- Research and data collection workflows
- Content aggregation and summarization
- Cost-sensitive AI workflows
- Production-grade AI applications requiring reliability

## Design Principles
- **Resilience First**: Automatic error recovery and graceful degradation
- **Developer Experience**: TypeScript-first with comprehensive logging
- **Performance Aware**: Efficient content processing and session management
- **Cost Conscious**: Transparent pricing with usage tracking
- **Extensible**: Modular architecture supporting custom implementations
- **Operational Clarity**: Deno task runner with single-purpose scripts for automation