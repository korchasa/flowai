import type {
  JinaScraperConfig,
  JinaScraperOptions,
  JinaScraperResponse,
  JinaScraperScrapeOptions,
} from "./types.ts";
import { JinaScraperError } from "./types.ts";
import type { RunContext } from "../../run-context/run-context.ts";
import type { FetchContentResult } from "../types.ts";
import { normalizeField } from "../local-fetcher/fetch-content.ts";

const DEFAULT_SEARCH_BASE_URL = "https://s.jina.ai";
const DEFAULT_READER_BASE_URL = "https://r.jina.ai";
const MAX_DEBUG_BODY_SIZE = 100 * 1024; // 100KB limit for debug files
const DEFAULT_CONTENT_LIMIT = 10_000;

/**
 * Masks sensitive header values for debug logging.
 */
function maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const masked = { ...headers };
  for (const [key] of Object.entries(masked)) {
    if (key.toLowerCase() === 'authorization') {
      masked[key] = '***';
    }
  }
  return masked;
}

/**
 * Truncates body content if it's too large for debug files.
 */
function truncateBody(body: string | null): string | null {
  if (!body || body.length <= MAX_DEBUG_BODY_SIZE) {
    return body;
  }
  return body.slice(0, MAX_DEBUG_BODY_SIZE) + `\n\n[TRUNCATED: ${body.length - MAX_DEBUG_BODY_SIZE} characters removed]`;
}

/**
 * Client for Jina Scraper API.
 *
 * @example
 * ```typescript
 * const ctx = createRunContext({ logger, debugDir: "./debug" });
 * const client = new JinaScraper(ctx, { apiKey: "your-api-key" });
 * const result = await client.search({ q: "OpenAI GPT-4" });
 * console.log(result.data);
 * ```
 */
export class JinaScraper {
  private readonly ctx: RunContext;
  private readonly apiKey: string;
  private readonly searchBaseUrl: string;
  private readonly readerBaseUrl: string;

  /**
   * Creates a new Jina Scraper API client.
   *
   * @param ctx - Run context for debug file saving.
   * @param config - Configuration options.
   * @throws {JinaScraperError} If API key is not provided in config and JINA_API_KEY environment variable is not set.
   */
  constructor(ctx: RunContext, config: JinaScraperConfig = {}) {
    this.ctx = ctx;

    // API key resolution: config parameter takes priority over environment variable
    // Throws error if neither is provided to ensure proper authentication
    this.apiKey = config.apiKey || Deno.env.get("JINA_API_KEY") || "";

    this.searchBaseUrl = config.searchBaseUrl || DEFAULT_SEARCH_BASE_URL;
    this.readerBaseUrl = config.readerBaseUrl || DEFAULT_READER_BASE_URL;

    // Validate that API key is available from either source
    if (!this.apiKey) {
      throw new JinaScraperError(
        "API key is required. Provide it via config.apiKey parameter or set JINA_API_KEY environment variable."
      );
    }
  }

  /**
   * Performs a search query using Jina Search API and returns the raw response.
   *
   * @param options - Search options including query and filters.
   * @returns Search results wrapped in Jina response envelope.
   * @throws {JinaScraperError} If the API request fails.
   *
   * @example
   * ```typescript
   * const result = await client.searchRaw({
   *   q: "TypeScript best practices",
   *   num: 10,
   *   type: "web"
   * });
   * ```
   */
  async searchRaw(options: JinaScraperOptions): Promise<JinaScraperResponse> {
    const { q, ...queryParams } = options;

    if (!q) {
      throw new JinaScraperError("Search query (q) is required");
    }

    const url = this.buildSearchUrl(q, queryParams);
    const headers = this.buildSearchHeaders(queryParams);

    // Save request debug info
    const requestData = {
      method: "GET",
      url,
      headers: maskSensitiveHeaders(headers),
      body: null,
      timestamp: new Date().toISOString(),
    };

    try {
      if (this.ctx.saveDebugFile) {
        await this.ctx.saveDebugFile({
          filename: `${Date.now()}-search-request.json`,
          content: JSON.stringify(requestData, null, 2),
          stageDir: "jina-search",
        });
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        // Save error response debug info
        const errorResponseBody = await response.text();
        const errorResponseDebugData = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: truncateBody(errorResponseBody),
          timestamp: new Date().toISOString(),
        };

        if (this.ctx.saveDebugFile) {
          await this.ctx.saveDebugFile({
            filename: `${Date.now()}-search-error-response.json`,
            content: JSON.stringify(errorResponseDebugData, null, 2),
            stageDir: "jina-search",
          });
        }

        throw new JinaScraperError(
          `HTTP error: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const contentType = response.headers.get("content-type");

      // Handle different response formats
      let responseData: JinaScraperResponse;
      let responseBody: string;

      if (contentType?.includes("application/json")) {
        const data = await response.json();
        responseData = data as JinaScraperResponse;
        responseBody = JSON.stringify(data);
      } else {
        // Handle plain text response
        responseBody = await response.text();
        responseData = {
          code: response.status,
          status: 20000,
          data: responseBody,
        };
      }

      // Save response debug info
      const responseDebugData = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: truncateBody(responseBody),
        timestamp: new Date().toISOString(),
      };

      if (this.ctx.saveDebugFile) {
        await this.ctx.saveDebugFile({
          filename: `${Date.now()}-search-response.json`,
          content: JSON.stringify(responseDebugData, null, 2),
          stageDir: "jina-search",
        });
      }

      return responseData;
    } catch (error) {
      if (error instanceof JinaScraperError) {
        throw error;
      }

      throw new JinaScraperError(
        `Failed to perform search: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Builds the search request URL with query parameters.
   */
  private buildSearchUrl(query: string, params: Omit<JinaScraperOptions, "q">): string {
    const url = new URL(`${this.searchBaseUrl}/${encodeURIComponent(query)}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      // Handle array parameters
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
      } else {
        url.searchParams.append(key, String(value));
      }
    });

    return url.toString();
  }

  /**
   * Builds the scrape request URL with query parameters.
   */
  private buildScrapeUrl(urlPath: string, params: Omit<JinaScraperScrapeOptions, "url">): string {
    const url = new URL(`${this.readerBaseUrl}/${encodeURIComponent(urlPath)}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      // Handle array parameters
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
      } else if (typeof value === "object") {
        // Handle nested objects like markdown options
        url.searchParams.append(key, JSON.stringify(value));
      } else {
        url.searchParams.append(key, String(value));
      }
    });

    return url.toString();
  }

  /**
   * Builds search request headers including authentication.
   */
  private buildSearchHeaders(params: Omit<JinaScraperOptions, "q">): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };

    // Map options to custom headers
    if (params.noCache) {
      headers["X-No-Cache"] = "true";
    }

    if (params.cacheTolerance !== undefined) {
      headers["X-Cache-Tolerance"] = String(params.cacheTolerance);
    }

    if (params.respondWith) {
      headers["X-Respond-With"] = params.respondWith;
    }

    if (params.timeout !== undefined) {
      headers["X-Timeout"] = String(params.timeout);
    }

    if (params.proxyUrl) {
      headers["X-Proxy-Url"] = params.proxyUrl;
    }

    if (params.userAgent) {
      headers["X-User-Agent"] = params.userAgent;
    }

    return headers;
  }

  /**
   * Builds scrape request headers including authentication.
   */
  private buildScrapeHeaders(params: Omit<JinaScraperScrapeOptions, "url">): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };

    // Map options to custom headers
    if (params.noCache) {
      headers["X-No-Cache"] = "true";
    }

    if (params.cacheTolerance !== undefined) {
      headers["X-Cache-Tolerance"] = String(params.cacheTolerance);
    }

    if (params.respondWith) {
      headers["X-Respond-With"] = params.respondWith;
    }

    if (params.withGeneratedAlt) {
      headers["X-With-Generated-Alt"] = "true";
    }

    if (params.withImagesSummary) {
      headers["X-With-Images-Summary"] = "true";
    }

    if (params.withLinksSummary) {
      headers["X-With-Links-Summary"] = "true";
    }

    if (params.retainLinks) {
      headers["X-Retain-Links"] = params.retainLinks;
    }

    if (params.retainImages) {
      headers["X-Retain-Images"] = params.retainImages;
    }

    if (params.withIframe !== undefined) {
      headers["X-With-Iframe"] = String(params.withIframe);
    }

    if (params.withShadowDom) {
      headers["X-With-Shadow-Dom"] = "true";
    }

    if (params.waitForSelector && params.waitForSelector.length > 0) {
      headers["X-Wait-For-Selector"] = params.waitForSelector.join(",");
    }

    if (params.targetSelector && params.targetSelector.length > 0) {
      headers["X-Target-Selector"] = params.targetSelector.join(",");
    }

    if (params.removeSelector && params.removeSelector.length > 0) {
      headers["X-Remove-Selector"] = params.removeSelector.join(",");
    }

    if (params.keepImgDataUrl) {
      headers["X-Keep-Img-Data-Url"] = "true";
    }

    if (params.proxyUrl) {
      headers["X-Proxy-Url"] = params.proxyUrl;
    }

    if (params.proxy) {
      headers["X-Proxy"] = params.proxy;
    }

    if (params.robotsTxt) {
      headers["X-Robots-Txt"] = params.robotsTxt;
    }

    if (params.doNotTrack !== undefined) {
      headers["DNT"] = params.doNotTrack ? "1" : "0";
    }

    if (params.setCookies && params.setCookies.length > 0) {
      headers["X-Set-Cookie"] = params.setCookies.join("; ");
    }

    if (params.userAgent) {
      headers["X-User-Agent"] = params.userAgent;
    }

    if (params.timeout !== undefined) {
      headers["X-Timeout"] = String(params.timeout);
    }

    if (params.locale) {
      headers["X-Locale"] = params.locale;
    }

    if (params.referer) {
      headers["X-Referer"] = params.referer;
    }

    if (params.tokenBudget !== undefined) {
      headers["X-Token-Budget"] = String(params.tokenBudget);
    }

    if (params.respondTiming) {
      headers["X-Respond-Timing"] = params.respondTiming;
    }

    if (params.engine) {
      headers["X-Engine"] = params.engine;
    }

    if (params.base) {
      headers["X-Base"] = params.base;
    }

    if (params.markdown) {
      const md = params.markdown;
      if (md.headingStyle) {
        headers["X-Md-Heading-Style"] = md.headingStyle;
      }
      if (md.hr) {
        headers["X-Md-Hr"] = md.hr;
      }
      if (md.bulletListMarker) {
        headers["X-Md-Bullet-List-Marker"] = md.bulletListMarker;
      }
      if (md.emDelimiter) {
        headers["X-Md-Em-Delimiter"] = md.emDelimiter;
      }
      if (md.strongDelimiter) {
        headers["X-Md-Strong-Delimiter"] = md.strongDelimiter;
      }
      if (md.linkStyle) {
        headers["X-Md-Link-Style"] = md.linkStyle;
      }
      if (md.linkReferenceStyle) {
        headers["X-Md-Link-Reference-Style"] = md.linkReferenceStyle;
      }
    }

    return headers;
  }

  /**
   * Alternative search method that uses the /search endpoint.
   *
   * @param options - Search options.
   * @returns Search results.
   */
  async searchIndex(options: JinaScraperOptions): Promise<JinaScraperResponse> {
    const url = new URL(`${this.searchBaseUrl}/search`);
    const headers = this.buildSearchHeaders(options);

    // Add all parameters to query string
    Object.entries(options).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
      } else {
        url.searchParams.append(key, String(value));
      }
    });

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new JinaScraperError(
          `HTTP error: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        const data = await response.json();
        return data as JinaScraperResponse;
      }

      const text = await response.text();
      return {
        code: response.status,
        status: 20000,
        data: text,
      };
    } catch (error) {
      if (error instanceof JinaScraperError) {
        throw error;
      }

      throw new JinaScraperError(
        `Failed to perform search: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Scrapes content from a URL using the Jina Reader API and returns the raw response.
   *
   * @param options - Scraping options including URL and format preferences.
   * @returns Scraped content wrapped in Jina response envelope.
   * @throws {JinaScraperError} If the API request fails.
   *
   * @example
   * ```typescript
   * const result = await client.scrapeUrlToResponse({
   *   url: "https://example.com/article",
   *   respondWith: "markdown"
   * });
   * console.log(result.data);
   * ```
   */
  async scrapeUrlToResponse(options: JinaScraperScrapeOptions): Promise<JinaScraperResponse> {
    const { url, ...queryParams } = options;

    if (!url) {
      throw new JinaScraperError("URL is required for scraping");
    }

    const requestUrl = this.buildScrapeUrl(url, queryParams);
    const headers = this.buildScrapeHeaders(queryParams);

    // Save request debug info
    const requestData = {
      method: "GET",
      url: requestUrl,
      headers: maskSensitiveHeaders(headers),
      body: null,
      timestamp: new Date().toISOString(),
    };

    try {
      if (this.ctx.saveDebugFile) {
        await this.ctx.saveDebugFile({
          filename: `${Date.now()}-scrape-url-request.json`,
          content: JSON.stringify(requestData, null, 2),
          stageDir: "jina-scrape",
        });
      }

      const response = await fetch(requestUrl, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        // Save error response debug info
        const errorResponseBody = await response.text();
        const errorResponseDebugData = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: truncateBody(errorResponseBody),
          timestamp: new Date().toISOString(),
        };

        if (this.ctx.saveDebugFile) {
          await this.ctx.saveDebugFile({
            filename: `${Date.now()}-scrape-url-error-response.json`,
            content: JSON.stringify(errorResponseDebugData, null, 2),
            stageDir: "jina-scrape",
          });
        }

        throw new JinaScraperError(
          `HTTP error: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const contentType = response.headers.get("content-type");

      // Handle different response formats
      let responseData: JinaScraperResponse;
      let responseBody: string;

      if (contentType?.includes("application/json")) {
        const data = await response.json();
        responseData = data as JinaScraperResponse;
        responseBody = JSON.stringify(data);
      } else {
        // Handle plain text response (markdown, html, etc.)
        responseBody = await response.text();
        responseData = {
          code: response.status,
          status: 20000,
          data: responseBody,
        };
      }

      // Save response debug info
      const responseDebugData = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: truncateBody(responseBody),
        timestamp: new Date().toISOString(),
      };

      if (this.ctx.saveDebugFile) {
        await this.ctx.saveDebugFile({
          filename: `${Date.now()}-scrape-url-response.json`,
          content: JSON.stringify(responseDebugData, null, 2),
          stageDir: "jina-scrape",
        });
      }

      return responseData;
    } catch (error) {
      if (error instanceof JinaScraperError) {
        throw error;
      }

      throw new JinaScraperError(
        `Failed to scrape URL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Scrapes content using the POST / endpoint and returns the raw response.
   *
   * @param options - Scraping options.
   * @returns Scraped content wrapped in Jina response envelope.
   * @throws {JinaScraperError} If the API request fails.
   *
   * @example
   * ```typescript
   * const result = await client.scrapeIndexToResponse({
   *   url: "https://example.com",
   *   respondWith: "content",
   *   timeout: 30
   * });
   * ```
   */
  async scrapeIndexToResponse(options: JinaScraperScrapeOptions): Promise<JinaScraperResponse> {
    const url = new URL(`${this.readerBaseUrl}/`);
    const headers = this.buildScrapeHeaders(options);

    // Prepare request body - exclude certain fields that go in headers
    const bodyParams = { ...options };
    const requestBody = JSON.stringify(bodyParams);

    // Save request debug info
    const requestData = {
      method: "POST",
      url: url.toString(),
      headers: maskSensitiveHeaders({
        ...headers,
        "Content-Type": "application/json",
      }),
      body: truncateBody(requestBody),
      timestamp: new Date().toISOString(),
    };

    try {
      if (this.ctx.saveDebugFile) {
        await this.ctx.saveDebugFile({
          filename: `${Date.now()}-scrape-index-request.json`,
          content: JSON.stringify(requestData, null, 2),
          stageDir: "jina-scrape",
        });
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      if (!response.ok) {
        // Save error response debug info
        const errorResponseBody = await response.text();
        const errorResponseDebugData = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: truncateBody(errorResponseBody),
          timestamp: new Date().toISOString(),
        };

        if (this.ctx.saveDebugFile) {
          await this.ctx.saveDebugFile({
            filename: `${Date.now()}-scrape-index-error-response.json`,
            content: JSON.stringify(errorResponseDebugData, null, 2),
            stageDir: "jina-scrape",
          });
        }

        throw new JinaScraperError(
          `HTTP error: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const contentType = response.headers.get("content-type");

      let responseData: JinaScraperResponse;
      let responseBody: string;

      if (contentType?.includes("application/json")) {
        const data = await response.json();
        responseData = data as JinaScraperResponse;
        responseBody = JSON.stringify(data);
      } else {
        responseBody = await response.text();
        responseData = {
          code: response.status,
          status: 20000,
          data: responseBody,
        };
      }

      // Save response debug info
      const responseDebugData = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: truncateBody(responseBody),
        timestamp: new Date().toISOString(),
      };

      if (this.ctx.saveDebugFile) {
        await this.ctx.saveDebugFile({
          filename: `${Date.now()}-scrape-index-response.json`,
          content: JSON.stringify(responseDebugData, null, 2),
          stageDir: "jina-scrape",
        });
      }

      return responseData;
    } catch (error) {
      if (error instanceof JinaScraperError) {
        throw error;
      }

      throw new JinaScraperError(
        `Failed to scrape: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetches content from a URL and returns it in a normalized format.
   *
   * @param url - URL to fetch content from.
   * @param options - Scraping options.
   * @returns Normalized content and metadata.
   */
  async fetch(
    url: string,
    options: {
      contentLimit?: number;
    } & Omit<JinaScraperScrapeOptions, "url" | "respondWith"> = {}
  ): Promise<FetchContentResult> {
    const { contentLimit, ...scrapeOptions } = options;

    const response = await this.scrapeUrlToResponse({
      url,
      respondWith: "json",
      ...scrapeOptions,
    });

    if (!response.data) {
      throw new JinaScraperError("No data returned from Jina Scraper");
    }

    // Jina can return data as a string (even if JSON) or as an object
    const data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;

    return this.mapToFetchResult(data, contentLimit);
  }

  /**
   * Performs a search and returns normalized content for each result.
   *
   * @param query - Search query.
   * @param options - Search options.
   * @returns Array of normalized content results.
   */
  async search(
    query: string,
    options: {
      contentLimit?: number;
    } & Omit<JinaScraperOptions, "q" | "respondWith"> = {}
  ): Promise<FetchContentResult[]> {
    const { contentLimit, ...searchOptions } = options;

    const response = await this.searchRaw({
      q: query,
      respondWith: "json",
      ...searchOptions,
    });

    if (!response.data) {
      return [];
    }

    const data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
    const results = Array.isArray(data) ? data : (data.results || []);

    return results.map((result: Record<string, unknown>) => this.mapToFetchResult(result, contentLimit));
  }

  /**
   * Maps Jina API response data to FetchContentResult format.
   */
  private mapToFetchResult(data: Record<string, unknown>, contentLimit?: number): FetchContentResult {
    const limit = contentLimit ?? DEFAULT_CONTENT_LIMIT;

    // We don't use normalizeContent() here because it collapses all whitespace into a single space,
    // which would destroy formatting. Jina's content is already cleaned and formatted.
    const rawContent = typeof data.content === "string" ? data.content : "";
    const text = rawContent.trim().slice(0, limit);

    return {
      url: normalizeField({ value: data.url }),
      canonicalUrl: normalizeField({ value: data.url }), // Jina JSON doesn't always provide a separate canonical URL
      title: normalizeField({ value: data.title }),
      description: normalizeField({ value: data.description }),
      image: normalizeField({ value: data.image }),
      author: normalizeField({ value: data.author }),
      publisher: normalizeField({ value: data.siteName }), // Map siteName to publisher
      date: normalizeField({ value: data.publishedTime }), // Map publishedTime to date
      lang: null, // Jina JSON response for Reader/Search doesn't typically include these fields
      logo: null,
      audio: null,
      video: null,
      text,
      html: typeof data.html === "string" ? data.html : null,
      textLength: text.length,
    };
  }
}
