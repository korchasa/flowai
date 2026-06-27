import { assertEquals, assertThrows } from "@std/assert";
import { parseReport } from "./verify.ts";

const SAMPLE = {
  total_instances: 1,
  submitted_instances: 500,
  completed_instances: 1,
  resolved_instances: 1,
  unresolved_instances: 0,
  empty_patch_instances: 0,
  error_instances: 0,
  completed_ids: ["psf__requests-1142"],
  resolved_ids: ["psf__requests-1142"],
};

Deno.test("parseReport: extracts counts and resolved ids", () => {
  const r = parseReport(SAMPLE);
  assertEquals(r.totalInstances, 1);
  assertEquals(r.completedInstances, 1);
  assertEquals(r.resolvedInstances, 1);
  assertEquals(r.errorInstances, 0);
  assertEquals(r.resolvedIds, ["psf__requests-1142"]);
});

Deno.test("parseReport: tolerates missing resolved_ids array", () => {
  const { resolved_ids: _omit, ...noIds } = SAMPLE;
  const r = parseReport(noIds);
  assertEquals(r.resolvedInstances, 1);
  assertEquals(r.resolvedIds, []);
});

Deno.test("parseReport: throws on missing numeric field", () => {
  assertThrows(() => parseReport({ total_instances: 1 }));
});

Deno.test("parseReport: throws on non-object", () => {
  assertThrows(() => parseReport(null));
  assertThrows(() => parseReport("nope"));
});
