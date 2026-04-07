import type {
    BraveSearchConfig,
    BraveSearchOptions,
    BraveSearchResponse,
} from "./types.ts";
import { BraveSearchError } from "./types.ts";
import type { RunContext } from "../../run-context/run-context.ts";

import { dump as yamlDump } from "js-yaml";

const DEFAULT_BASE_URL = "https://api.search.brave.com/res/v1";
const MAX_DEBUG_BODY_SIZE = 100 * 1024; // 100KB limit for debug files

/**
 * Masks sensitive header values for debug logging.
 */
function maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
    const masked = { ...headers };
    for (const [key] of Object.entries(masked)) {
        if (key.toLowerCase() === 'x-subscription-token') {
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
 * Client for Brave Search API.
 */
export class BraveSearchClient {
    private readonly ctx: RunContext;
    private readonly apiKey: string;
    private readonly baseUrl: string;

    /**
     * Creates a new Brave Search API client.
     *
     * @param ctx - Run context for debug file saving.
     * @param config - Configuration options.
     * @throws {BraveSearchError} If API key is not provided in config and BRAVE_API_KEY environment variable is not set.
     */
    constructor(ctx: RunContext, config: BraveSearchConfig = {}) {
        this.ctx = ctx;

        // API key resolution: config parameter takes priority over environment variable
        this.apiKey = config.apiKey || Deno.env.get("BRAVE_API_KEY") || "";

        this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;

        if (!this.apiKey) {
            throw new BraveSearchError(
                "API key is required. Provide it via config.apiKey parameter or set BRAVE_API_KEY environment variable."
            );
        }
    }

    /**
     * Performs a web search using Brave Search API.
     * Includes automatic retry logic for 429 (Rate Limit) errors.
     *
     * @param options - Search options including query and filters.
     * @returns Search results.
     * @throws {BraveSearchError} If the API request fails.
     */
    async search(options: BraveSearchOptions): Promise<BraveSearchResponse> {
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
            attempts++;
            const { q, ...queryParams } = options;

            if (!q) {
                throw new BraveSearchError("Search query (q) is required");
            }

            const url = this.buildUrl("/web/search", q, queryParams);
            const headers = {
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": this.apiKey
            };

            const timestamp = new Date().toISOString();
            const requestData = {
                method: "GET",
                url: url.toString(),
                headers: maskSensitiveHeaders(headers),
                body: null,
                timestamp,
            };

            const logData: Record<string, unknown> = {
                timestamp,
                request: requestData,
            };

            try {
                const response = await fetch(url.toString(), {
                    method: "GET",
                    headers,
                });

                const responseDebugData: Record<string, unknown> = {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    timestamp: new Date().toISOString(),
                };

                const bodyText = await response.text();
                responseDebugData.raw = truncateBody(bodyText);

                if (response.status === 429 && attempts < maxAttempts) {
                    await this.saveDebugLog(
                        { ...logData, response: responseDebugData, retry: true, attempt: attempts },
                        "brave-search-retry"
                    );
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                if (!response.ok) {
                    responseDebugData.error = response.statusText;
                    logData.response = responseDebugData;

                    await this.saveDebugLog(logData, "brave-search-error");

                    throw new BraveSearchError(
                        `HTTP error: ${response.status} ${response.statusText}`,
                        response.status
                    );
                }

                try {
                    const data = JSON.parse(bodyText);
                    responseDebugData.parsed = data;
                    logData.response = responseDebugData;

                    await this.saveDebugLog(logData, "brave-search-response");

                    return data as BraveSearchResponse;
                } catch (_error) {
                    responseDebugData.error = "Failed to parse JSON response";
                    logData.response = responseDebugData;
                    await this.saveDebugLog(logData, "brave-search-error");
                    throw new BraveSearchError("Invalid JSON response from Brave Search API");
                }

            } catch (error) {
                if (error instanceof BraveSearchError) {
                    throw error;
                }

                logData.error = {
                    message: error instanceof Error ? error.message : String(error),
                    timestamp: new Date().toISOString(),
                };
                await this.saveDebugLog(logData, "brave-search-fatal");

                throw new BraveSearchError(
                    `Failed to perform search: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }

        // Should not happen due to throws above, but for TS:
        throw new BraveSearchError("Request failed after retries");
    }

    /**
     * Performs multiple searches with rate limiting.
     *
     * @param queries - Array of search queries.
     * @param options - Additional search options (same for all queries).
     * @param rps - Requests per second. Default is 1.
     * @returns Array of search responses.
     */
    async searchMany(
        queries: string[],
        options: Omit<BraveSearchOptions, "q"> = {},
        rps: number = 1
    ): Promise<BraveSearchResponse[]> {
        const results: BraveSearchResponse[] = [];
        const delayMs = 1000 / rps;

        for (let i = 0; i < queries.length; i++) {
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            const result = await this.search({ q: queries[i], ...options });
            results.push(result);
        }

        return results;
    }

    /**
     * Saves combined request/response data as a YAML debug file.
     */
    private async saveDebugLog(logData: Record<string, unknown>, suffix: string): Promise<void> {
        if (this.ctx.saveDebugFile) {
            const yaml = yamlDump(logData, {
                indent: 2,
                lineWidth: -1,
                noRefs: true,
            });

            await this.ctx.saveDebugFile({
                filename: `${Date.now()}-${suffix}.yaml`,
                content: yaml,
                stageDir: "brave-search",
            });
        }
    }


    /**
     * Builds the request URL with query parameters.
     */
    private buildUrl(path: string, query: string, params: Omit<BraveSearchOptions, "q">): URL {
        const url = new URL(`${this.baseUrl}${path}`);

        url.searchParams.append("q", query);

        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            url.searchParams.append(key, String(value));
        });

        return url;
    }
}
