# Reference: Content Fetchers — Interfaces

## Shared Types and Utilities

```
interface FetchContentResult
  url: string | null
  canonicalUrl: string | null
  title, description, image, author, publisher, date, lang, logo, audio, video: string | null
  text: string           // clean extracted text
  html: string | null    // clean HTML
  textLength: number

function normalizeField(value: unknown): string | null
  // non-string → null, trim, empty → null

function normalizeContent(content: string): string
  // collapse whitespace, trim

function maskSensitiveHeaders(headers, sensitiveKeys: string[]): Record<string, string>
  // copies headers, replaces values of sensitiveKeys with "***"

function truncateBody(body: string | null, maxSize?: number): string | null
  // default maxSize = 100KB
  // appends "[TRUNCATED: N characters removed]"

async function saveDebugLog(ctx, data, stageDir, suffix): Promise<void>
  // ctx.saveDebugFile({ filename: "{timestamp}-{suffix}.yaml", content: yamlDump(data), stageDir })
```

---

## Local Fetcher

```
const DEFAULT_CONTENT_LIMIT = 10_000

async function fetchFromURL(url, options: FetchFromURLOptions): Promise<FetchContentResult>
  // download HTML → processHtml

async function processHtml(html, options: FetchOptions): Promise<FetchContentResult>
  // Pipeline: sanitize → extract → normalize fields → slice text to contentLimit

interface FetchOptions
  url?: string
  contentLimit?: number    // default 10000
  ctx?: RunContext

class Sanitizer
  // Removes: script, style, iframe, noscript, object, embed, applet,
  //          form, input, button, select, textarea, nav, footer, header
  async sanitize(html: string): Promise<string>

async function extract(html: string): Promise<ExtractedData>
  // Try 1: Mozilla Readability (JSDOM with VirtualConsole to suppress CSS warnings)
  // Try 2: cheerio fallback (basic tag extraction)
  // Metadata via metascraper
```

---

## Brave Search Client

```
class BraveSearchClient
  constructor(ctx: RunContext, config?: BraveSearchConfig)
    // apiKey: config.apiKey > process.env.BRAVE_API_KEY
    // baseUrl: default "https://api.search.brave.com/res/v1"

  async search(options: BraveSearchOptions): Promise<BraveSearchResponse>
    // GET /web/search?q=...
    // Header: X-Subscription-Token
    // 429 → retry once after 1 second
    // Debug: saves request/response YAML to "brave-search" stage

  async searchMany(queries, options?, rps?): Promise<BraveSearchResponse[]>
    // Sequential with delay = 1000/rps between queries

interface BraveSearchConfig
  apiKey?: string
  baseUrl?: string

interface BraveSearchOptions
  q: string                                       // required
  count?, offset?: number
  country?, search_lang?: string
  safesearch?: "off" | "moderate" | "strict"
  freshness?: "pd" | "pw" | "pm" | "py"
  site?, filetype?: string
```

---

## Jina Scraper

```
class JinaScraper
  constructor(ctx: RunContext, config?: JinaScraperConfig)
    // apiKey: config.apiKey > process.env.JINA_API_KEY
    // searchBaseUrl: default "https://s.jina.ai"
    // readerBaseUrl: default "https://r.jina.ai"

  async searchRaw(options: JinaScraperOptions): Promise<JinaScraperResponse>
    // GET {searchBaseUrl}/?q=...
    // Header: Authorization: Bearer {apiKey}

  async scrapeUrlToResponse(options: { url, respondWith? }): Promise<JinaScraperResponse>
    // GET {readerBaseUrl}/{url}

  async scrapeIndexToResponse(options: JinaScraperScrapeOptions): Promise<JinaScraperResponse>
    // POST {readerBaseUrl}/  with body { url, ... }

  async fetch(url, options?): Promise<FetchContentResult>
    // scrapeUrlToResponse → normalizeResult

  async search(query, options?): Promise<FetchContentResult[]>
    // searchRaw → map normalizeResult

  private buildHeaders(options): Record<string, string>
    // Maps options to Jina X- headers:
    //   respondWith → X-Respond-With
    //   retainImages → X-Retain-Images
    //   timeout → X-Timeout
    //   waitForSelector → X-Wait-For
    //   cssSelector → X-Target-Selector

interface JinaScraperConfig
  apiKey?: string
  searchBaseUrl?: string
  readerBaseUrl?: string

interface JinaScraperOptions
  q: string
  num?, page?: number
  site?: string[]
  filetype?: string[]
  respondWith?: "markdown" | "html" | "text" | "content"

interface JinaScraperScrapeOptions
  url: string
  respondWith?: string
  retainImages?: "none" | "all" | "alt"
  timeout?: number
  waitForSelector?: string[]
  cssSelector?: string
```
