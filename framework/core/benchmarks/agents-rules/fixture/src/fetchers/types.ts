/**
 * Result of content and metadata extraction.
 */
export interface ExtractedData {
  readonly url: string | null;
  readonly canonicalUrl: string | null;
  readonly title: string | null;
  readonly description: string | null;
  readonly image: string | null;
  readonly author: string | null;
  readonly publisher: string | null;
  readonly date: string | null;
  readonly lang: string | null;
  readonly logo: string | null;
  readonly audio: string | null;
  readonly video: string | null;
  readonly text: string;
  readonly html: string | null;
}

/**
 * Result of content fetching and metadata extraction.
 */
export interface FetchContentResult extends ExtractedData {
  readonly textLength: number;
}

