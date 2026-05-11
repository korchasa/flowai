/**
 * Local content fetcher module.
 * Provides high-performance HTML extraction, sanitization, and normalization using Readability.
 *
 * @module
 */

import { extract } from "./extractor.ts";
import { Downloader } from "./downloader.ts";
import type { DownloaderOptions } from "./downloader.ts";
import { Sanitizer } from "./sanitizer.ts";
import type { RunContext } from "../../run-context/run-context.ts";
import type { FetchContentResult } from "../types.ts";

const DEFAULT_CONTENT_LIMIT = 10_000;

/**
 * Options for fetching content.
 */
export interface FetchOptions {
  readonly url?: string;
  readonly contentLimit?: number;
  readonly ctx?: RunContext;
}

/**
 * Options for fetching content from a URL.
 */
export interface FetchFromURLOptions extends DownloaderOptions {
  readonly contentLimit?: number;
  readonly ctx: RunContext;
}

const sanitizer = new Sanitizer();

/**
 * Normalizes field values by trimming and converting empty strings to null.
 */
export function normalizeField({ value }: Readonly<{ value: unknown }>): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Normalizes content text by collapsing whitespace.
 */
export function normalizeContent({ content }: Readonly<{ content: string }>): string {
  return content.replace(/\s+/g, " ").trim();
}

/**
 * Fetches and processes content from raw HTML string.
 *
 * @param params - Parameters including HTML content and options.
 * @returns Processed content and metadata.
 */
export async function fetch(
  { html, options = {} }: Readonly<{
    html: string;
    options?: FetchOptions;
  }>
): Promise<FetchContentResult> {
  const sanitized = await sanitizer.sanitize({ html, ctx: options.ctx });
  const extracted = await extract({ html: sanitized });
  const contentLimit = options.contentLimit ?? DEFAULT_CONTENT_LIMIT;
  const text = normalizeContent({ content: extracted.text }).slice(0, contentLimit);

  const resolvedUrl = normalizeField({ value: extracted.url }) ?? normalizeField({ value: options.url });
  const canonicalUrl = normalizeField({ value: extracted.canonicalUrl }) ?? resolvedUrl;

  return {
    url: resolvedUrl,
    canonicalUrl,
    title: normalizeField({ value: extracted.title }),
    description: normalizeField({ value: extracted.description }),
    image: normalizeField({ value: extracted.image }),
    author: normalizeField({ value: extracted.author }),
    publisher: normalizeField({ value: extracted.publisher }),
    date: normalizeField({ value: extracted.date }),
    lang: normalizeField({ value: extracted.lang }),
    logo: normalizeField({ value: extracted.logo }),
    audio: normalizeField({ value: extracted.audio }),
    video: normalizeField({ value: extracted.video }),
    text,
    html: extracted.html,
    textLength: text.length,
  };
}

/**
 * Downloads content from a URL and processes it.
 *
 * @param params - Parameters including URL and options.
 * @returns Processed content and metadata.
 */
export async function fetchFromURL(
  { url, options, downloader }: Readonly<{
    url: string;
    options: FetchFromURLOptions;
    downloader?: Downloader;
  }>
): Promise<FetchContentResult> {
  const { contentLimit, ctx, ...downloaderOptions } = options;
  const downloaderInstance = downloader || new Downloader(ctx, downloaderOptions);
  const html = await downloaderInstance.download({ url });
  return await fetch({ html, options: { url, contentLimit, ctx } });
}
