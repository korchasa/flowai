/**
 * Example usage of Jina Scraper API client.
 *
 * To run this example:
 * 1. Set JINA_API_KEY environment variable
 * 2. Run: npx tsx src/jina-scraper/example.ts
 */

import { JinaScraper } from "./jina-scraper.ts";
import { createRunContext } from "../../run-context/run-context.ts";
import { Logger } from "../../logger/logger.ts";

async function main() {
  try {
    // Create run context for debug file saving
    const logger = new Logger({ context: "jina-example", logLevel: "info" });
    const ctx = createRunContext({
      logger,
      debugDir: "./debug"
    });

    // Initialize client (reads API key from JINA_API_KEY env var)
    const client = new JinaScraper(ctx);

    console.log("=== Basic Web Search ===");
    const webResult = await client.searchRaw({
      q: "TypeScript best practices",
      num: 5,
      type: "web"
    });
    console.log("Response:", webResult);
    console.log();

    console.log("=== Search with Site Filter ===");
    const siteResult = await client.searchRaw({
      q: "machine learning",
      site: ["github.com"],
      num: 3
    });
    console.log("Response:", siteResult);
    console.log();

    console.log("=== Markdown Response ===");
    const markdownResponse = await client.searchRaw({
      q: "REST API design patterns",
      respondWith: "markdown",
      num: 2
    });
    console.log("Response:", markdownResponse);
    console.log();

    console.log("=== Search with Multiple Filters ===");
    const advancedResult = await client.searchRaw({
      q: "kubernetes tutorial",
      site: ["medium.com", "dev.to"],
      intitle: ["kubernetes"],
      loc: ["en"],
      num: 5
    });
    console.log("Response:", advancedResult);
    console.log();

    console.log("=== Web Scraping - Markdown (Raw Response) ===");
    const scrapeResult = await client.scrapeUrlToResponse({
      url: "https://example.com",
      respondWith: "markdown",
      retainImages: "none",
      timeout: 30
    });
    console.log("Scraped content:", scrapeResult.data);
    console.log();

    console.log("=== Web Scraping - Content with Images (Raw Response) ===");
    const contentResult = await client.scrapeIndexToResponse({
      url: "https://httpbin.org/html",
      respondWith: "content",
      retainImages: "all",
      withGeneratedAlt: true,
      waitForSelector: ["h1"]
    });
    console.log("Content result:", contentResult);
    console.log();

    console.log("=== High-level fetch ===");
    const fetchResult = await client.fetch("https://example.com");
    console.log("Title:", fetchResult.title);
    console.log("Text length:", fetchResult.textLength);
    console.log();

    console.log("=== High-level search ===");
    const searchResults = await client.search("TypeScript news", { num: 2 });
    console.log("Found:", searchResults.length, "results");
    if (searchResults.length > 0) {
      console.log("First result title:", searchResults[0].title);
    }

  } catch (error) {
    console.error("Error:", error);
    Deno.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  main();
}
