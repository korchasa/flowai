/**
 * Configuration options for Jina Scraper API client.
 */
export interface JinaScraperConfig {
  /**
   * API key for authentication. If not provided, will be read from JINA_API_KEY environment variable.
   */
  readonly apiKey?: string;

  /**
   * Base URL for Jina Search API.
   * @default "https://s.jina.ai"
   */
  readonly searchBaseUrl?: string;

  /**
   * Base URL for Jina Reader API.
   * @default "https://r.jina.ai"
   */
  readonly readerBaseUrl?: string;
}

/**
 * Search query options.
 */
export interface JinaScraperOptions {
  /**
   * Search query string.
   */
  readonly q: string;

  /**
   * Search engine to use.
   */
  readonly engine?: "google" | "bing" | "reader";

  /**
   * Search result type.
   * @default "web"
   */
  readonly type?: "web" | "images" | "news";

  /**
   * Number of results to return (0-20).
   */
  readonly num?: number;

  /**
   * Country code for geolocation.
   */
  readonly gl?: string;

  /**
   * Language code.
   */
  readonly hl?: string;

  /**
   * Location string.
   */
  readonly location?: string;

  /**
   * Page number for pagination.
   */
  readonly page?: number;

  /**
   * Enable fallback behavior.
   */
  readonly fallback?: boolean;

  /**
   * No first page results.
   */
  readonly nfpr?: boolean;

  /**
   * Returns web pages with a specific file extension.
   */
  readonly ext?: string[];

  /**
   * Returns web pages created in the specified file type.
   */
  readonly filetype?: string[];

  /**
   * Returns webpages containing the specified term in the title of the page.
   */
  readonly intitle?: string[];

  /**
   * Returns web pages written in the specified language.
   */
  readonly loc?: string[];

  /**
   * Returns web pages coming only from a specific web site.
   */
  readonly site?: string[];

  /**
   * Response format preference.
   */
  readonly respondWith?: "content" | "markdown" | "html" | "text" | "pageshot" | "screenshot" | "vlm" | "readerlm-v2" | string;

  /**
   * Disable cache.
   */
  readonly noCache?: boolean;

  /**
   * Cache tolerance in seconds.
   */
  readonly cacheTolerance?: number;

  /**
   * Timeout in seconds (max 180).
   */
  readonly timeout?: number;

  /**
   * Custom proxy URL.
   */
  readonly proxyUrl?: string;

  /**
   * User agent override.
   */
  readonly userAgent?: string;
}

/**
 * Options for scraping content from a URL.
 */
export interface JinaScraperScrapeOptions {
  /**
   * URL to scrape content from.
   */
  readonly url: string;

  /**
   * HTML content to scrape (alternative to url).
   */
  readonly html?: string;

  /**
   * Base URL mode for relative URLs.
   * @default "initial"
   */
  readonly base?: "initial" | "final";

  /**
   * Base64 encoded PDF content.
   */
  readonly pdf?: string;

  /**
   * Base64 encoded file content.
   */
  readonly file?: string;

  /**
   * Response format preference.
   * @default "content"
   */
  readonly respondWith?: "content" | "markdown" | "html" | "text" | "pageshot" | "screenshot" | "vlm" | "readerlm-v2" | string;

  /**
   * Enable automatic alt-text generation for images.
   */
  readonly withGeneratedAlt?: boolean;

  /**
   * Image retention mode.
   * @default "all"
   */
  readonly retainImages?: "none" | "all" | "alt" | "all_p" | "alt_p";

  /**
   * Link retention mode.
   * @default "all"
   */
  readonly retainLinks?: "none" | "all" | "text" | "gpt-oss";

  /**
   * Enable dedicated summary section for links.
   */
  readonly withLinksSummary?: boolean;

  /**
   * Enable dedicated summary section for images.
   */
  readonly withImagesSummary?: boolean;

  /**
   * Disable cache.
   */
  readonly noCache?: boolean;

  /**
   * Cache tolerance in seconds.
   */
  readonly cacheTolerance?: number;

  /**
   * CSS selectors to target specific elements.
   */
  readonly targetSelector?: string[];

  /**
   * CSS selectors to wait for before scraping.
   */
  readonly waitForSelector?: string[];

  /**
   * CSS selectors to remove from the page.
   */
  readonly removeSelector?: string[];

  /**
   * Keep data URLs for images instead of converting to object URLs.
   */
  readonly keepImgDataUrl?: boolean;

  /**
   * Enable iframe content inclusion.
   */
  readonly withIframe?: boolean | string;

  /**
   * Enable shadow DOM content inclusion.
   */
  readonly withShadowDom?: boolean;

  /**
   * Cookies to set for the request.
   */
  readonly setCookies?: string[];

  /**
   * Custom proxy URL.
   */
  readonly proxyUrl?: string;

  /**
   * Proxy server to use (country code).
   */
  readonly proxy?: string;

  /**
   * User agent override.
   */
  readonly userAgent?: string;

  /**
   * Engine to use for scraping.
   */
  readonly engine?: string;

  /**
   * JavaScript to inject into page.
   */
  readonly injectPageScript?: string[];

  /**
   * JavaScript to inject into frames.
   */
  readonly injectFrameScript?: string[];

  /**
   * Timeout in seconds (max 180).
   */
  readonly timeout?: number;

  /**
   * Browser locale.
   */
  readonly locale?: string;

  /**
   * Referer header.
   */
  readonly referer?: string;

  /**
   * Token budget limit.
   */
  readonly tokenBudget?: number;

  /**
   * Custom instruction for content processing.
   */
  readonly instruction?: string;

  /**
   * JSON schema for structured output.
   */
  readonly jsonSchema?: unknown;

  /**
   * Robots.txt handling.
   */
  readonly robotsTxt?: string;

  /**
   * Do Not Track setting.
   */
  readonly doNotTrack?: unknown;

  /**
   * Response timing mode.
   */
  readonly respondTiming?: "html" | "visible-content" | "mutation-idle" | "resource-idle" | "media-idle" | "network-idle";

  /**
   * Markdown formatting options.
   */
  readonly markdown?: {
    readonly headingStyle?: "setext" | "atx";
    readonly hr?: string;
    readonly bulletListMarker?: "-" | "+" | "*";
    readonly emDelimiter?: "_" | "*";
    readonly strongDelimiter?: "__" | "**";
    readonly linkStyle?: "inlined" | "referenced" | "discarded";
    readonly linkReferenceStyle?: "full" | "collapsed" | "shortcut" | "discarded";
  };
}

/**
 * Response envelope from Jina Scraper API.
 */
export interface JinaScraperResponse<T = string> {
  /**
   * HTTP status code.
   */
  readonly code: number;

  /**
   * Extended status code.
   */
  readonly status: number;

  /**
   * Response data payload.
   */
  readonly data?: T;

  /**
   * Additional metadata.
   */
  readonly meta?: unknown;
}

/**
 * Error response from Jina Scraper API.
 */
export class JinaScraperError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly status?: number
  ) {
    super(message);
    this.name = "JinaScraperError";
  }
}
