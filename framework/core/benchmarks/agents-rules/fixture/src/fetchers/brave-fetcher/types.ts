/**
 * Types for Brave Search API.
 */

export class BraveSearchError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = "BraveSearchError";
  }
}

export interface BraveSearchConfig {
  /**
   * API key for Brave Search API.
   * If not provided, will look for BRAVE_API_KEY environment variable.
   */
  apiKey?: string;

  /**
   * Base URL for Brave Search API.
   * Defaults to https://api.search.brave.com/res/v1
   */
  baseUrl?: string;
}

export interface BraveSearchOptions {
  /**
   * search query
   */
  q: string;

  /**
   * The number of search results to return in response.
   * Max is 20.
   */
  count?: number;

  /**
   * The number of results to skip/offset.
   */
  offset?: number;

  /**
   * Filters search results for adult content.
   * The following values are supported:
   * - "off": No filtering is done.
   * - "moderate": Filters explicit content, like images and videos, but allows text search results.
   * - "strict": Filters all explicit content.
   * Default: "moderate"
   */
  safesearch?: "off" | "moderate" | "strict";

  /**
   * The country code of the search results.
   */
  country?: string;

  /**
   * The search language preference.
   */
  search_lang?: string;

  /**
   * User interface language preference.
   */
  ui_lang?: string;

  /**
   * Filters results by freshness.
   * - "pd": Past Day
   * - "pw": Past Week
   * - "pm": Past Month
   * - "py": Past Year
   * - YYYY-MM-DDtoYYYY-MM-DD: Custom range
   */
  freshness?: string;

  /**
   * Whether to include a text description of the results.
   */
  text_decorations?: boolean;

  /**
   * output format (json)
   */
  format?: "json";

  /**
   * If true, adds spellcheck options to the response.
   */
  spellcheck?: boolean;
}

export interface BraveSearchResult {
    title: string;
    url: string;
    description: string;
    page_age?: string;
    profile?: {
        name: string;
        long_name: string;
        img: string;
    };
    meta_url?: {
        scheme: string;
        netloc: string;
        hostname: string;
        favicon: string;
        path: string;
    };
    thumbnail?: {
        src: string;
        original?: string;
    };
    age?: string;
}

export interface BraveSearchWebResponse {
  type: "search";
  results: BraveSearchResult[];
  family_friendly: boolean;
}

export interface BraveSearchResponse {
  query: {
    original: string;
    show_strict_warning: boolean;
    is_navigational: boolean;
    is_news_breaking: boolean;
    spellcheck_off: boolean;
    country: string;
    bad_results: boolean;
    should_fallback: boolean;
    postal_code: string;
    city: string;
    header_country: string;
    more_results_available: boolean;
    state: string;
  };
  mixed: {
    type: "mixed";
    main: unknown[];
    top: unknown[];
    side: unknown[];
  };
  type: "search";
  web?: BraveSearchWebResponse;
}
