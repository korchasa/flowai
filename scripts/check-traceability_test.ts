import { assertEquals } from "@std/assert";
import {
  extractFrIdsFromCode,
  extractFrIdsFromSrs,
  findOrphanedRefs,
  type OrphanedRef,
} from "./check-traceability.ts";

Deno.test("extractFrIdsFromSrs — extracts FR-* IDs from markdown headings and criteria", () => {
  const srs = `
### FR-DIST: Global Framework Distribution
- **Description:** CLI tool.

#### FR-DIST.SYNC Sync Command
- **Acceptance:**
  - [x] Files synced.

#### FR-DIST.FILTER Selective Sync
- **Acceptance:**
  - [x] Include/exclude filters.

### FR-CMD-EXEC: Command Execution
- **Description:** Executable workflows.
- **Acceptance verified by benchmarks:** See matrix.

### FR-PACKS: Pack System
#### FR-PACKS.STRUCT Pack Structure
- **Acceptance:**
  - [ ] Pending item.
`;
  const ids = extractFrIdsFromSrs(srs);
  assertEquals(ids.has("FR-DIST"), true);
  assertEquals(ids.has("FR-DIST.SYNC"), true);
  assertEquals(ids.has("FR-DIST.FILTER"), true);
  assertEquals(ids.has("FR-CMD-EXEC"), true);
  assertEquals(ids.has("FR-PACKS"), true);
  assertEquals(ids.has("FR-PACKS.STRUCT"), true);
  assertEquals(ids.has("FR-NONEXISTENT"), false);
});

Deno.test("extractFrIdsFromSrs — ignores inline FR references in prose", () => {
  const srs = `
### FR-DOCS: Documentation
- **Description:** Enforced by FR-MAINT.
`;
  const ids = extractFrIdsFromSrs(srs);
  assertEquals(ids.has("FR-DOCS"), true);
  // FR-MAINT in prose is NOT a definition — only headings/criteria define IDs
  assertEquals(ids.has("FR-MAINT"), false);
});

Deno.test("extractFrIdsFromCode — finds TS comments", () => {
  const refs = extractFrIdsFromCode(
    "test.ts",
    `// FR-DIST.SYNC — sync skills
const x = 1;
// FR-MAINT
function check() {}`,
  );
  assertEquals(refs.length, 2);
  assertEquals(refs[0], { id: "FR-DIST.SYNC", file: "test.ts", line: 1 });
  assertEquals(refs[1], { id: "FR-MAINT", file: "test.ts", line: 3 });
});

Deno.test("extractFrIdsFromCode — finds YAML/shell comments", () => {
  const refs = extractFrIdsFromCode(
    "ci.yml",
    `name: CI
# FR-CICD.PIN — SHA pinning
steps:
  - uses: actions/checkout@abc123`,
  );
  assertEquals(refs.length, 1);
  assertEquals(refs[0], { id: "FR-CICD.PIN", file: "ci.yml", line: 2 });
});

Deno.test("extractFrIdsFromCode — ignores FR in non-comment context", () => {
  const refs = extractFrIdsFromCode(
    "test.ts",
    `const msg = "see FR-DIST.SYNC for details";
console.log(msg);`,
  );
  assertEquals(refs.length, 0);
});

Deno.test("findOrphanedRefs — detects orphaned references", () => {
  const srsIds = new Set(["FR-DIST", "FR-MAINT"]);
  const codeRefs = [
    { id: "FR-DIST", file: "sync.ts", line: 10 },
    { id: "FR-NONEXISTENT", file: "foo.ts", line: 5 },
    { id: "FR-MAINT", file: "check.ts", line: 1 },
    { id: "FR-DELETED", file: "bar.ts", line: 20 },
  ];
  const orphaned = findOrphanedRefs(srsIds, codeRefs);
  assertEquals(orphaned.length, 2);
  assertEquals(orphaned[0], { id: "FR-NONEXISTENT", file: "foo.ts", line: 5 });
  assertEquals(orphaned[1], { id: "FR-DELETED", file: "bar.ts", line: 20 });
});

Deno.test("findOrphanedRefs — no orphans when all refs valid", () => {
  const srsIds = new Set(["FR-DIST", "FR-MAINT"]);
  const codeRefs = [
    { id: "FR-DIST", file: "sync.ts", line: 10 },
    { id: "FR-MAINT", file: "check.ts", line: 1 },
  ];
  const orphaned = findOrphanedRefs(srsIds, codeRefs);
  assertEquals(orphaned.length, 0);
});

Deno.test("findOrphanedRefs — empty code refs", () => {
  const srsIds = new Set(["FR-DIST"]);
  const codeRefs: OrphanedRef[] = [];
  const orphaned = findOrphanedRefs(srsIds, codeRefs);
  assertEquals(orphaned.length, 0);
});

Deno.test("extractFrIdsFromCode — handles sub-IDs correctly", () => {
  const refs = extractFrIdsFromCode(
    "hooks.ts",
    `// FR-HOOK-RESOURCES.FORMAT
// FR-HOOK-RESOURCES.INSTALL — IDE-specific
// FR-HOOK-RESOURCES.SYNC-INFRA`,
  );
  assertEquals(refs.length, 3);
  assertEquals(refs[0].id, "FR-HOOK-RESOURCES.FORMAT");
  assertEquals(refs[1].id, "FR-HOOK-RESOURCES.INSTALL");
  assertEquals(refs[2].id, "FR-HOOK-RESOURCES.SYNC-INFRA");
});
