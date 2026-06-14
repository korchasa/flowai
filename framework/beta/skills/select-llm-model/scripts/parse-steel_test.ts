import { assertEquals, assertThrows } from "jsr:@std/assert";
import { parseSteel } from "./parse-steel.ts";

// Inline fixture mirroring a real steel.dev `/leaderboards/<bench>/` page:
// uniform server-rendered table, model in `<span class="system-name">`, score in
// the adjacent cell. Scores are SYSTEM/submission-attributed (agent scaffold +
// model), which the parser preserves verbatim in the model field.
function page(title: string, rows: Array<[string, string]>): string {
  const body = rows
    .map(([name, score]) =>
      `<tr class="lb-row group align-middle">` +
      `<td class="px-3 py-3"><div class="flex"><span class="system-name">${name}</span>` +
      `<a href="#" class="repo-source-link">x</a></div></td>` +
      `<td class="px-3 py-2 text-right">${score}</td>` +
      `<td class="px-3 py-2">Org</td><td>Feb 2026</td><td>Source</td></tr>`
    )
    .join("");
  return `<!DOCTYPE html><html><head><title>${title}</title></head><body>` +
    `<table><thead><tr><th>System / Submission</th><th>Score</th>` +
    `<th>Organization</th><th>Reported</th><th>Source</th></tr></thead>` +
    `<tbody>${body}</tbody></table></body></html>`;
}

const WEBARENA = page(
  "WebArena Leaderboard 2026: Latest Browser Agent Scores | Steel.dev",
  [
    ["WebTactix (DeepSeek v3.2)", "74.3%"],
    ["IBM CUGA", "71.6%"],
  ],
);

const OSWORLD = page(
  "OSWorld Leaderboard 2026: Latest Computer Use Agent Scores | Steel.dev",
  [["Claude Opus 4.8", "62.1%"]],
);

const SWEBENCH = page(
  "SWE-bench Verified Leaderboard 2026: Latest Coding Agent Scores | Steel.dev",
  [["TestModel Pro", "78.4%"], ["TestModel Mini", "61.0%"]],
);

Deno.test("steel: webarena page → web-agent axis rows", () => {
  const rows = parseSteel(WEBARENA);
  assertEquals(rows.length, 2);
  assertEquals(rows.every((r) => r.axis === "web-agent"), true);
  assertEquals(rows.every((r) => r.source === "steel"), true);
  assertEquals(rows.every((r) => r.higherIsBetter), true);
});

Deno.test("steel: keeps the system/submission name verbatim (not a bare model)", () => {
  const rows = parseSteel(WEBARENA);
  assertEquals(rows[0].model, "WebTactix (DeepSeek v3.2)");
  assertEquals(rows[0].score, 74.3);
});

Deno.test("steel: osworld page → computer-use axis", () => {
  const rows = parseSteel(OSWORLD);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].axis, "computer-use");
  assertEquals(rows[0].model, "Claude Opus 4.8");
  assertEquals(rows[0].score, 62.1);
});

Deno.test("steel: swe-bench-verified page → swe-bench axis", () => {
  const rows = parseSteel(SWEBENCH);
  assertEquals(rows.length, 2);
  assertEquals(rows.every((r) => r.axis === "swe-bench"), true);
  assertEquals(rows[0].model, "TestModel Pro");
  assertEquals(rows[0].score, 78.4);
});

Deno.test("steel: ignores a CSS bar-width % preceding the Score cell", () => {
  // Real pages render a progress bar `style="width:74.34%"` BEFORE the displayed
  // "74.3%" Score cell — the parser must read the Score column's visible text,
  // not the first percentage anywhere in the row.
  const html =
    `<!DOCTYPE html><html><head><title>WebArena | Steel.dev</title></head>` +
    `<body><table><tbody><tr class="lb-row">` +
    `<td><span class="system-name">BarAgent</span>` +
    `<div class="bar" style="width:74.34%"></div></td>` +
    `<td class="text-right">74.3%</td><td>Org</td></tr></tbody></table></body></html>`;
  const rows = parseSteel(html);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].model, "BarAgent");
  assertEquals(rows[0].score, 74.3);
});

Deno.test("steel: unknown benchmark title throws (→ Gap)", () => {
  assertThrows(() =>
    parseSteel(page("Mystery Leaderboard | Steel.dev", [["A", "9%"]]))
  );
});

Deno.test("steel: no parseable rows throws (→ Gap)", () => {
  assertThrows(() =>
    parseSteel(
      "<html><head><title>WebArena | Steel.dev</title></head><body>x</body></html>",
    )
  );
});
