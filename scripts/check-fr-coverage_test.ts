/**
 * Coverage tests for `documents/requirements.md`.
 *
 * Today the only assertion is structural: FR-DOC-ANCHORS — the SALP adoption
 * FR — MUST carry at least one `**Acceptance verified by …:**` line. The SRS
 * is the project's contract for what we promise to deliver; an FR without an
 * acceptance reference is a wish, not a contract.
 *
 * Future tests will broaden this to "every FR has acceptance" once the
 * Phase 2 supersede cycle lands. Today the file pins only the FR introduced
 * by this task to keep the gate scoped.
 */
import { assert } from "@std/assert";

const SRS_PATH = "documents/requirements.md";

async function readSrs(): Promise<string> {
  return await Deno.readTextFile(SRS_PATH);
}

function extractSection(content: string, frId: string): string | null {
  const lines = content.split("\n");
  let inside = false;
  const collected: string[] = [];
  for (const line of lines) {
    const headingMatch = line.match(
      /^###\s+(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*)/,
    );
    if (headingMatch) {
      if (inside) break;
      if (headingMatch[1] === frId) inside = true;
      continue;
    }
    if (inside) collected.push(line);
  }
  return inside ? collected.join("\n") : null;
}

Deno.test("fr-doc-anchors-has-acceptance", async () => {
  const srs = await readSrs();
  const section = extractSection(srs, "FR-DOC-ANCHORS");
  assert(section !== null, "FR-DOC-ANCHORS section not found in SRS");
  const hasAcceptance =
    /\*\*Acceptance verified by (?:tests|acceptance tests|command):?\*\*/i.test(
      section,
    );
  assert(
    hasAcceptance,
    "FR-DOC-ANCHORS section must declare at least one **Acceptance verified by …:** field",
  );
});
