/**
 * HTML download helper.
 *
 * Purpose: download raw HTML text for a given URL. Sanitization is intentionally
 * kept separate (see `sanitizer.ts`) so sanitizers remain pure string to string.
 */

import type { RunContext } from "../../run-context/run-context.ts";

const DEFAULT_DOWNLOAD_TIMEOUT_MS = 12_000;
const DEFAULT_ACCEPT_HEADER = "text/html,application/xhtml+xml";
const DEFAULT_USER_AGENT =
  "TLDRist News Digester/1.0 (https://github.com/tldrist/news-digester)";
const MAX_DEBUG_BODY_SIZE = 100 * 1024; // 100KB limit for debug files

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
function truncateBody(body: string): string {
  if (body.length <= MAX_DEBUG_BODY_SIZE) {
    return body;
  }
  return body.slice(0, MAX_DEBUG_BODY_SIZE) + `\n\n[TRUNCATED: ${body.length - MAX_DEBUG_BODY_SIZE} characters removed]`;
}

/**
 * Options for the Downloader.
 */
export interface DownloaderOptions {
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly headers?: HeadersInit;
}

/**
 * Downloads HTML from a URL and returns it as a string.
 */
export class Downloader {
  private readonly ctx: RunContext;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly headers?: HeadersInit;

  /**
   * Creates a new Downloader instance.
   *
   * @param ctx - Run context for debug file saving.
   * @param options - Configuration options.
   */
  constructor(ctx: RunContext, options: Readonly<DownloaderOptions> = {}) {
    this.ctx = ctx;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS;
    this.headers = options.headers;
  }

  /**
   * Downloads page content.
   *
   * @param params - Parameters for the download.
   * @returns Raw HTML string.
   * @throws Error when URL is invalid, request fails, or response is non-OK.
   */
  async download(
    { url, options = {} }: Readonly<{
      url: string;
      options?: DownloaderOptions;
    }>
  ): Promise<string> {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
    }

    const fetchImpl = options.fetchImpl ?? this.fetchImpl;
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Prepare request headers
    const requestHeaders: Record<string, string> = {
      accept: DEFAULT_ACCEPT_HEADER,
      "user-agent": DEFAULT_USER_AGENT,
      ...(this.headers as Record<string, string> ?? {}),
      ...(options.headers as Record<string, string> ?? {}),
    };

    // Save request debug info
    const requestData = {
      method: "GET",
      url: parsed.toString(),
      headers: maskSensitiveHeaders(requestHeaders as Record<string, string>),
      body: null,
      timestamp: new Date().toISOString(),
    };

    try {
      if (this.ctx.saveDebugFile) {
        await this.ctx.saveDebugFile({
          filename: `${Date.now()}-download-request.json`,
          content: JSON.stringify(requestData, null, 2),
          stageDir: "local-download",
        });
      }

      const response = await fetchImpl(parsed.toString(), {
        method: "GET",
        headers: requestHeaders,
        signal: controller.signal,
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
            filename: `${Date.now()}-download-error-response.json`,
            content: JSON.stringify(errorResponseDebugData, null, 2),
            stageDir: "local-download",
          });
        }

        throw new Error(
          `Failed to download page: status=${response.status} url=${parsed.toString()}`,
        );
      }

      const responseBody = await response.text();

      // Save success response debug info
      const responseDebugData = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: truncateBody(responseBody),
        timestamp: new Date().toISOString(),
      };

      if (this.ctx.saveDebugFile) {
        await this.ctx.saveDebugFile({
          filename: `${Date.now()}-download-response.json`,
          content: JSON.stringify(responseDebugData, null, 2),
          stageDir: "local-download",
        });
      }

      return responseBody;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
