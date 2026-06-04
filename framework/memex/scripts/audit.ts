#!/usr/bin/env -S deno run --allow-read

/**
 * Deterministic memex audit check (SALP).
 *
 * Walks the `pages/` directory of a memex, parses SALP references
 * (`[REF:mx-<type>:<slug>]`), and reports: dead links, orphan pages,
 * concept pages missing the "Counter-Arguments and Gaps" section, and
 * stale `index.md` rows.
 *
 * Usage:
 *   deno run --allow-read audit.ts <pages-dir>
 *
 * Exit code is always 0 — caller (the agent or CI) decides what to do
 * with the report. Output is one issue per line, format `<KIND>: <detail>`.
 *
 * Issue kinds:
 *   - DEAD_LINK       — REF points at a slug that has no page file.
 *   - ORPHAN          — content page has no inbound REF from any other page.
 *   - MISSING_SECTION — concept page lacks the gaps section.
 *   - INDEX_MISSING   — page file exists but no row in `pages/index.md`.
 *   - INDEX_DEAD      — `pages/index.md` references a slug with no file.
 *   - MALFORMED_REF   — REF token violates SALP grammar (logged, not fatal).
 */

import { walk } from "jsr:@std/fs/walk";
import { basename, relative } from "jsr:@std/path";

/** Match any `[REF:mx-<type>:<slug>]` or `[REF:mx-<type>:<slug> | display]`.
 *  Captures (1) namespace, (2) slug. */
const SALP_REF_RE =
  /\[REF:(mx-(?:concept|person|source|answer)):([a-z0-9][a-z0-9.-]*)(?:\s*\|\s*[^\]]*)?\]/g;
/** Greedy scan: any `[REF:…]` token (for malformed detection). */
const SALP_REF_LOOSE_RE = /\[REF:([^\]\n]*)\]/g;
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
const SKIP_SLUGS = new Set(["index", "log", "AGENTS"]);

interface PageInfo {
  slug: string;
  rel: string;
  type?: string;
  /** Outbound REF targets — slug only (the `mx-<type>` namespace is
   *  validated separately; targeting and orphan-detection both operate
   *  on slug identity). */
  outbound: Set<string>;
  body: string;
  malformed: Array<{ raw: string; line: number }>;
}

function parseRefs(text: string): {
  slugs: Set<string>;
  malformed: Array<{ raw: string; line: number }>;
} {
  const slugs = new Set<string>();
  const malformed: Array<{ raw: string; line: number }> = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const valid = new Set<string>();
    for (const m of line.matchAll(SALP_REF_RE)) {
      const slug = m[2].toLowerCase();
      slugs.add(slug);
      valid.add(m[0]);
    }
    for (const m of line.matchAll(SALP_REF_LOOSE_RE)) {
      if (valid.has(m[0])) continue;
      // Anything that opened `[REF:` but did NOT match the strict pattern
      // is malformed (wrong namespace, missing colon, etc.).
      malformed.push({ raw: m[0], line: i + 1 });
    }
  }
  return { slugs, malformed };
}

async function readPages(pagesDir: string): Promise<Map<string, PageInfo>> {
  const pages = new Map<string, PageInfo>();
  for await (
    const entry of walk(pagesDir, {
      exts: [".md"],
      includeDirs: false,
      followSymlinks: false,
    })
  ) {
    const rel = relative(pagesDir, entry.path);
    const slug = basename(entry.path).replace(/\.md$/, "");
    const text = await Deno.readTextFile(entry.path);
    const fmMatch = text.match(FRONTMATTER_RE);
    const fm = fmMatch ? fmMatch[1] : "";
    const typeMatch = fm.match(/^type:\s*(\S+)/m);
    const { slugs, malformed } = parseRefs(text);
    pages.set(slug.toLowerCase(), {
      slug,
      rel,
      type: typeMatch?.[1],
      outbound: slugs,
      body: text,
      malformed,
    });
  }
  return pages;
}

function checkDeadLinks(pages: Map<string, PageInfo>): string[] {
  const issues: string[] = [];
  for (const page of pages.values()) {
    for (const target of page.outbound) {
      if (!pages.has(target)) {
        issues.push(`DEAD_LINK: [REF:mx-*:${target}] in ${page.rel}`);
      }
    }
  }
  return issues;
}

function checkOrphans(pages: Map<string, PageInfo>): string[] {
  // "Orphan" = no inbound REF from any CONTENT page. Catalog (index.md) and
  // log entries don't count — they're navigation, not semantic connection.
  const inbound = new Map<string, Set<string>>();
  for (const slug of pages.keys()) inbound.set(slug, new Set());
  for (const page of pages.values()) {
    if (SKIP_SLUGS.has(page.slug)) continue;
    for (const target of page.outbound) {
      inbound.get(target)?.add(page.slug);
    }
  }
  const issues: string[] = [];
  for (const [slug, page] of pages) {
    if (SKIP_SLUGS.has(page.slug)) continue;
    if (page.rel.startsWith("answers/")) continue;
    if ((inbound.get(slug)?.size ?? 0) === 0) {
      issues.push(`ORPHAN: ${page.rel} has no inbound [REF:mx-*:...]`);
    }
  }
  return issues;
}

function checkMissingGaps(pages: Map<string, PageInfo>): string[] {
  const issues: string[] = [];
  for (const page of pages.values()) {
    if (page.type !== "concept") continue;
    if (!/##\s+Counter-Arguments and Gaps/i.test(page.body)) {
      issues.push(
        `MISSING_SECTION: ${page.rel} (concept) lacks 'Counter-Arguments and Gaps'`,
      );
    }
  }
  return issues;
}

function checkIndexDrift(
  pages: Map<string, PageInfo>,
  indexBody: string | null,
): string[] {
  if (indexBody === null) return ["MISSING_INDEX: pages/index.md not found"];
  const { slugs: indexed } = parseRefs(indexBody);
  const issues: string[] = [];
  for (const [slug, page] of pages) {
    if (SKIP_SLUGS.has(page.slug)) continue;
    if (page.rel.startsWith("answers/")) continue;
    if (!indexed.has(slug)) {
      issues.push(`INDEX_MISSING: ${page.rel} not listed in index.md`);
    }
  }
  for (const slug of indexed) {
    if (!pages.has(slug) && !SKIP_SLUGS.has(slug)) {
      issues.push(
        `INDEX_DEAD: index.md references [REF:mx-*:${slug}] which has no file`,
      );
    }
  }
  return issues;
}

function checkMalformedRefs(pages: Map<string, PageInfo>): string[] {
  const issues: string[] = [];
  for (const page of pages.values()) {
    for (const { raw, line } of page.malformed) {
      issues.push(`MALFORMED_REF: ${page.rel}:${line}: ${raw}`);
    }
  }
  return issues;
}

export async function audit(pagesDir: string): Promise<string[]> {
  let stat: Deno.FileInfo;
  try {
    stat = await Deno.stat(pagesDir);
  } catch {
    return [`ERROR: ${pagesDir} not found`];
  }
  if (!stat.isDirectory) return [`ERROR: ${pagesDir} is not a directory`];

  const pages = await readPages(pagesDir);
  let indexBody: string | null = null;
  try {
    indexBody = await Deno.readTextFile(`${pagesDir}/index.md`);
  } catch { /* missing index handled below */ }

  return [
    ...checkDeadLinks(pages),
    ...checkOrphans(pages),
    ...checkMissingGaps(pages),
    ...checkIndexDrift(pages, indexBody),
    ...checkMalformedRefs(pages),
  ].sort();
}

if (import.meta.main) {
  const pagesDir = Deno.args[0];
  if (!pagesDir) {
    console.error("Usage: audit.ts <pages-dir>");
    Deno.exit(2);
  }
  const issues = await audit(pagesDir);
  if (issues.length === 0) {
    console.log("OK: 0 issues");
  } else {
    for (const issue of issues) console.log(issue);
    console.log(`\nTotal: ${issues.length} issue(s)`);
  }
  Deno.exit(0);
}
