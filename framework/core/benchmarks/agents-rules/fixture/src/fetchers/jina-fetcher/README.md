# Jina Scraper API Client

TypeScript/JavaScript client for the [Jina Scraper API](https://jina.ai/search).

## Features

- 🔍 **Simple Search Interface** - Clean and intuitive API for web, image, and news search
- 🔐 **Environment-based Configuration** - Supports API key from environment variables
- 📝 **Full TypeScript Support** - Complete type definitions included
- 🎯 **Advanced Filtering** - Support for site, filetype, language filters and more
- ⚡ **Multiple Response Formats** - JSON, Markdown, HTML, plain text
- 🛡️ **Error Handling** - Comprehensive error handling with custom error types

## Installation

```bash
npm install @korchasa/ai-skel-ts
```

## Quick Start

```typescript
import { JinaScraper } from '@korchasa/ai-skel-ts/jina-scraper';

// Initialize client (API key from JINA_API_KEY environment variable)
const client = new JinaScraper();

// Or provide API key directly
const client = new JinaScraper({ apiKey: 'your-api-key' });

// Perform a search
const result = await client.search({
  q: "TypeScript best practices",
  num: 10,
  type: "web"
});

console.log(result.data);
```

## Configuration

### API Key

The API key can be provided in two ways:

1. **Environment Variable (recommended)**:
   ```bash
   export JINA_API_KEY=your-api-key
   ```

2. **Constructor Parameter**:
   ```typescript
   const client = new JinaScraper({ apiKey: 'your-api-key' });
   ```

### Custom Base URL

```typescript
const client = new JinaScraper({
  apiKey: 'your-api-key',
  baseUrl: 'https://custom.jina.ai'
});
```

## Usage Examples

### Basic Web Search

```typescript
const result = await client.search({
  q: "machine learning tutorials",
  num: 20,
  type: "web"
});
```

### Search with Filters

```typescript
const result = await client.search({
  q: "neural networks",
  site: ["arxiv.org", "github.com"],
  filetype: ["pdf"],
  num: 10
});
```

### Search Specific Site

```typescript
const result = await client.search({
  q: "REST API design",
  site: ["stackoverflow.com"],
  intitle: ["API"],
  num: 15
});
```

### Get Results in Markdown

```typescript
const result = await client.search({
  q: "TypeScript documentation",
  respondWith: "markdown",
  num: 5
});
```

### Image Search

```typescript
const result = await client.search({
  q: "artificial intelligence",
  type: "images",
  num: 20
});
```

### News Search

```typescript
const result = await client.search({
  q: "technology trends",
  type: "news",
  num: 10
});
```

### Advanced Search with Multiple Filters

```typescript
const result = await client.search({
  q: "kubernetes tutorial",
  site: ["medium.com", "dev.to"],
  intitle: ["kubernetes", "k8s"],
  loc: ["en"],
  num: 20,
  engine: "google",
  timeout: 30
});
```

### Using Alternative Endpoint

```typescript
// Use /search endpoint instead of /{q}
const result = await client.searchIndex({
  q: "search query",
  provider: "google",
  num: 10
});
```

### Custom Headers and Options

```typescript
const result = await client.search({
  q: "web scraping",
  noCache: true,
  timeout: 60,
  userAgent: "MyBot/1.0",
  proxyUrl: "http://proxy.example.com:8080"
});
```

## API Reference

### Constructor Options

```typescript
interface JinaScraperConfig {
  apiKey?: string;           // API key (or use JINA_API_KEY env var)
  baseUrl?: string;          // Base URL (default: "https://s.jina.ai")
}
```

### Search Options

```typescript
interface JinaScraperOptions {
  // Required
  q: string;                                    // Search query

  // Search Configuration
  engine?: "google" | "bing" | "reader";        // Search engine
  type?: "web" | "images" | "news";             // Search type
  provider?: "google" | "bing" | "reader";      // Provider
  num?: number;                                 // Results count (0-20)
  count?: number;                               // Results count alias
  page?: number;                                // Page number

  // Location & Language
  gl?: string;                                  // Country code
  hl?: string;                                  // Language code
  location?: string;                            // Location string
  loc?: string[];                               // Language filter

  // Filters
  site?: string[];                              // Site filter
  filetype?: string[];                          // File type filter
  ext?: string[];                               // Extension filter
  intitle?: string[];                           // Title filter

  // Response Options
  respondWith?: "content" | "markdown" | "html" // Response format
              | "text" | "pageshot" | "screenshot"
              | "vlm" | "readerlm-v2" | string;
  noCache?: boolean;                            // Disable cache
  cacheTolerance?: number;                      // Cache tolerance (seconds)

  // Request Options
  timeout?: number;                             // Timeout (seconds, max 180)
  proxyUrl?: string;                            // Proxy URL
  userAgent?: string;                           // User agent override

  // Other
  fallback?: boolean;                           // Enable fallback
  nfpr?: boolean;                               // No first page results
}
```

### Response Format

```typescript
interface JinaScraperResponse<T = string> {
  code: number;       // HTTP status code
  status: number;     // Extended status code
  data?: T;           // Response payload
  meta?: unknown;     // Additional metadata
}
```

### Error Handling

```typescript
import { JinaScraperError } from '@korchasa/ai-skel-ts/jina-scraper';

try {
  const result = await client.search({ q: "test" });
} catch (error) {
  if (error instanceof JinaScraperError) {
    console.error('Search failed:', error.message);
    console.error('Status code:', error.code);
  }
}
```

## Search Operators

### Site Filter

Restrict results to specific sites:

```typescript
site: ["github.com", "stackoverflow.com"]
```

### File Type Filter

Find specific file types:

```typescript
filetype: ["pdf", "docx"]
```

### Title Filter

Find pages with specific terms in title:

```typescript
intitle: ["tutorial", "guide"]
```

### Language Filter

Filter by language (ISO 639-1 codes):

```typescript
loc: ["en", "es"]
```

## Response Formats

The API supports multiple response formats via the `respondWith` option:

- `content` - Default content format
- `markdown` - Markdown formatted text
- `html` - HTML content
- `text` - Plain text
- `pageshot` - Page screenshot
- `screenshot` - Screenshot
- `vlm` - VLM format
- `readerlm-v2` - ReaderLM v2 format

## Rate Limiting & Caching

Control caching behavior:

```typescript
const result = await client.search({
  q: "cached search",
  noCache: true,              // Disable cache
  cacheTolerance: 300         // Cache tolerance in seconds
});
```

## License

MIT

## Related Links

- [Jina Search API Documentation](https://jina.ai/search)
- [Jina AI](https://jina.ai/)
