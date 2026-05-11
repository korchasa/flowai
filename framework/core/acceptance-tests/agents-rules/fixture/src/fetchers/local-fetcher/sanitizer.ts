/**
 * HTML sanitization helpers.
 *
 * Purpose: remove high-risk / noisy elements from HTML before passing page
 * content into LLM extraction prompts.
 */

import * as cheerio from "cheerio";
import type { RunContext } from "../../run-context/run-context.ts";

const FORBID_TAGS = [
  "script",
  "style",
  "template",
  "canvas",
  "svg",
  "iframe",
  "object",
  "embed",
  "portal",
  "noframes",
  "param",
  "source",
  "track",
  "map",
  "area",
];

/**
 * Removes a fixed set of high-risk / noisy tags from an HTML document.
 * 
 * Uses cheerio for robust parsing without executing scripts or CSS.
 * Strict mode: only fixes structure and removes blacklisted tags.
 * Preserves all attributes and non-blacklisted tags.
 */
export class Sanitizer {
  /**
   * Sanitizes the provided HTML by fixing structure and removing noisy tags.
   *
   * @param params - Parameters for sanitization.
   * @returns Sanitized HTML string.
   */
  async sanitize({ html, ctx }: Readonly<{ html: string; ctx?: RunContext }>): Promise<string> {
    if (!html) return "";

    if (ctx?.saveDebugFile) {
      await ctx.saveDebugFile({
        filename: "original.html",
        content: html,
        stageDir: "sanitizer",
      });
    }

    // Load HTML with cheerio (default parse5 parser)
    const $ = cheerio.load(html, {
      xml: false,
    });

    // Remove forbidden tags
    $(FORBID_TAGS.join(",")).remove();

    const sanitized = $.html();

    if (ctx?.saveDebugFile) {
      await ctx.saveDebugFile({
        filename: "sanitized.html",
        content: sanitized,
        stageDir: "sanitizer",
      });
    }

    return sanitized;
  }
}
