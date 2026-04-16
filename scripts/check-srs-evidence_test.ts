import { assertEquals } from "@std/assert";
import {
  extractEvidenceClaims,
  extractTestNames,
} from "./check-srs-evidence.ts";

Deno.test("extractEvidenceClaims - picks up backticked file+test", () => {
  const content = `- [x] Foo bar.
  Evidence: \`cli/src/sync_test.ts::global mode installs templates\`
`;
  const claims = extractEvidenceClaims("docs/requirements.md", content);
  assertEquals(claims.length, 1);
  assertEquals(claims[0].targetFile, "cli/src/sync_test.ts");
  assertEquals(claims[0].testName, "global mode installs templates");
});

Deno.test("extractEvidenceClaims - picks up unquoted file+test", () => {
  const content = `Evidence: cli/src/foo_test.ts::my test name.`;
  const claims = extractEvidenceClaims("doc.md", content);
  assertEquals(claims.length, 1);
  assertEquals(claims[0].targetFile, "cli/src/foo_test.ts");
  assertEquals(claims[0].testName, "my test name");
});

Deno.test("extractEvidenceClaims - picks up file-only evidence", () => {
  const content = `Evidence: \`cli/src/foo_test.ts\` passes.`;
  const claims = extractEvidenceClaims("doc.md", content);
  assertEquals(claims.length, 1);
  assertEquals(claims[0].targetFile, "cli/src/foo_test.ts");
  assertEquals(claims[0].testName, null);
});

Deno.test("extractEvidenceClaims - picks up line-number ref (backticked)", () => {
  const content = `Evidence: \`cli/src/source_test.ts:306-319\` covers it.`;
  const claims = extractEvidenceClaims("doc.md", content);
  assertEquals(claims.length, 1);
  assertEquals(claims[0].targetFile, "cli/src/source_test.ts");
  // Line-number form → file existence only; no test name to validate.
  assertEquals(claims[0].testName, null);
});

Deno.test("extractEvidenceClaims - picks up single-line-number ref", () => {
  const content = `Evidence: \`cli/src/foo_test.ts:42\` has it.`;
  const claims = extractEvidenceClaims("doc.md", content);
  assertEquals(claims.length, 1);
  assertEquals(claims[0].targetFile, "cli/src/foo_test.ts");
  assertEquals(claims[0].testName, null);
});

Deno.test("extractEvidenceClaims - ignores non-test files", () => {
  const content = `Evidence: cli/src/sync.ts:42 — the main path.`;
  const claims = extractEvidenceClaims("doc.md", content);
  assertEquals(claims.length, 0);
});

Deno.test("extractEvidenceClaims - multiple claims on one file", () => {
  const content = `- Evidence: \`a_test.ts::one\`
- Evidence: \`b_test.ts::two\``;
  const claims = extractEvidenceClaims("doc.md", content);
  assertEquals(claims.length, 2);
  assertEquals(claims[0].testName, "one");
  assertEquals(claims[1].testName, "two");
});

// --- extractTestNames ---

Deno.test("extractTestNames - picks up Deno.test positional", () => {
  const names = extractTestNames(`Deno.test("foo", () => {});`);
  assertEquals([...names], ["foo"]);
});

Deno.test("extractTestNames - picks up Deno.test object form", () => {
  const names = extractTestNames(
    `Deno.test({ name: "foo bar", fn: () => {} });`,
  );
  assertEquals([...names], ["foo bar"]);
});

Deno.test("extractTestNames - picks up it() and test() (bdd/jest style)", () => {
  const names = extractTestNames(`
    it("should work", () => {});
    test("another one", () => {});
  `);
  assertEquals(names.has("should work"), true);
  assertEquals(names.has("another one"), true);
});

Deno.test("extractTestNames - empty for no tests", () => {
  const names = extractTestNames("const x = 1;");
  assertEquals(names.size, 0);
});
