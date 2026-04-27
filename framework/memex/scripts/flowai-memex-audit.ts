#!/usr/bin/env -S deno run --allow-read

/**
 * Deterministic memex audit check.
 *
 * Walks the `pages/` directory of a memex, parses [[wikilinks]] and
 * frontmatter, and reports: dead links, orphan pages, concept pages
 * missing the "Counter-Arguments and Gaps" section, and stale
 * `index.md` rows.
 *
 * Usage:
 *   deno run --allow-read flowai-memex-audit.ts <pages-dir>
 *
 * Exit code is always 0 — caller (the agent or CI) decides what to do
 * with the report. Output is one issue per line, format `<KIND>: <detail>`.
 */

import { walk } from "jsr:@std/fs/walk";
import { basename, relative } from "jsr:@std/path";

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
const SKIP_SLUGS = new Set(["index", "log", "AGENTS"]);

interface PageInfo {
  slug: string;
  rel: string;
  type?: string;
  outbound: Set<string>;
  body: string;
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
    const outbound = new Set<string>();
    for (const m of text.matchAll(WIKILINK_RE)) {
      outbound.add(m[1].trim().toLowerCase());
    }
    pages.set(slug.toLowerCase(), {
      slug,
      rel,
      type: typeMatch?.[1],
      outbound,
      body: text,
    });
  }
  return pages;
}

function checkDeadLinks(pages: Map<string, PageInfo>): string[] {
  const issues: string[] = [];
  for (const page of pages.values()) {
    for (const target of page.outbound) {
      if (!pages.has(target)) {
        issues.push(`DEAD_LINK: [[${target}]] in ${page.rel}`);
      }
    }
  }
  return issues;
}

function checkOrphans(pages: Map<string, PageInfo>): string[] {
  // "Orphan" = no inbound link from any CONTENT page. Catalog (index.md) and
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
    // answers are filed standalone — don't require inbound links yet.
    if (page.rel.startsWith("answers/")) continue;
    if ((inbound.get(slug)?.size ?? 0) === 0) {
      issues.push(`ORPHAN: ${page.rel} has no inbound [[links]]`);
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
  const indexed = new Set<string>();
  for (const m of indexBody.matchAll(WIKILINK_RE)) {
    indexed.add(m[1].trim().toLowerCase());
  }
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
        `INDEX_DEAD: index.md references [[${slug}]] which has no file`,
      );
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
  ].sort();
}

if (import.meta.main) {
  const pagesDir = Deno.args[0];
  if (!pagesDir) {
    console.error("Usage: flowai-memex-audit.ts <pages-dir>");
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
