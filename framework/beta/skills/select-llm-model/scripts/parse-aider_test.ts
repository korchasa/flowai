import { assertEquals, assertThrows } from "jsr:@std/assert";
import { parseAider } from "./parse-aider.ts";

// Inline fixture in the real Aider Polyglot `polyglot_leaderboard.yml` shape.
const AIDER_YAML = `- dirname: 2025-02-25-gemini
  test_cases: 225
  model: Gemini 2.0 Pro exp-02-05
  pass_rate_2: 35.6
  edit_format: whole
- dirname: 2024-07-mini
  test_cases: 225
  model: gpt-4o-mini-2024-07-18
  pass_rate_2: 3.6
  edit_format: whole
- dirname: 2024-10-sonnet
  test_cases: 225
  model: claude-3-5-sonnet-20241022
  pass_rate_2: 51.6
  edit_format: diff`;

Deno.test("Aider: emits diff-edit rows from pass_rate_2", () => {
  const rows = parseAider(AIDER_YAML);
  assertEquals(rows.length > 0, true);
  for (const r of rows) {
    assertEquals(r.axis, "diff-edit");
    assertEquals(r.higherIsBetter, true);
    assertEquals(r.source, "aider");
  }
});

Deno.test("Aider: a known model carries its pass_rate_2", () => {
  const rows = parseAider(AIDER_YAML);
  const sonnet = rows.find((r) => r.model === "claude-3-5-sonnet-20241022");
  assertEquals(sonnet?.score, 51.6);
});

Deno.test("Aider: empty / non-list YAML yields no rows", () => {
  assertEquals(parseAider("just a string"), []);
});

Deno.test("Aider: malformed YAML throws (→ Gap)", () => {
  assertThrows(() => parseAider("key: [unclosed\n  bad: : :"));
});
