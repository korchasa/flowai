/**
 * Jina Scraper API client for TypeScript.
 *
 * @module jina-scraper
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { JinaScraper } from '@korchasa/ai-skel-ts/jina-scraper';
 *
 * // API key from environment variable JINA_API_KEY
 * const client = new JinaScraper();
 *
 * // Or provide API key directly
 * const client = new JinaScraper({ apiKey: 'your-api-key' });
 *
 * // Perform a search for raw data
 * const result = await client.searchRaw({
 *   q: "TypeScript best practices",
 *   num: 10,
 *   type: "web"
 * });
 *
 * console.log(result.data);
 * ```
 *
 * @example
 * Scrape content from a URL to raw response:
 * ```typescript
 * const scrapeResult = await client.scrapeUrlToResponse({
 *   url: "https://example.com/article",
 *   respondWith: "markdown"
 * });
 *
 * console.log(scrapeResult.data);
 * ```
 *
 * @example
 * Fetch content from a URL:
 * ```typescript
 * const result = await client.fetch("https://example.com/article");
 * console.log(result.text);
 * ```
 *
 * @example
 * Search and get results:
 * ```typescript
 * const results = await client.search("TypeScript best practices");
 * console.log(results[0].text);
 * ```
 *
 * @example
 * Advanced usage with filters:
 * ```typescript
 * const result = await client.searchRaw({
 *   q: "machine learning",
 *   site: ["github.com"],
 *   filetype: ["pdf"],
 *   num: 5,
 *   respondWith: "markdown"
 * });
 * ```
 *
 * @example
 * Advanced scraping with options to raw response:
 * ```typescript
 * const scrapeResult = await client.scrapeIndexToResponse({
 *   url: "https://example.com",
 *   respondWith: "content",
 *   retainImages: "none",
 *   timeout: 30,
 *   waitForSelector: [".content"]
 * });
 * ```
 */

export { JinaScraper } from "./client.ts";
export {
  JinaScraperError,
  type JinaScraperConfig,
  type JinaScraperOptions,
  type JinaScraperScrapeOptions,
  type JinaScraperResponse,
} from "./types.ts";
