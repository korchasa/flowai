import { assertEquals } from "@std/assert";
import { buildCheckPlan } from "./task-check.ts";

Deno.test("buildCheckPlan: prerequisites has bundle as only entry", () => {
  const plan = buildCheckPlan();
  assertEquals(plan.prerequisites.length, 1);
  assertEquals(plan.prerequisites[0].args, ["task", "bundle"]);
});

Deno.test("buildCheckPlan: parallel has 14 independent checks", () => {
  const plan = buildCheckPlan();
  assertEquals(plan.parallel.length, 14);

  // Verify key checks are present
  const labels = plan.parallel.map((c) => c.args.join(" "));
  assertEquals(labels.some((l) => l.includes("fmt --check")), true);
  assertEquals(labels.some((l) => l.includes("lint scripts")), true);
  assertEquals(labels.some((l) => l.includes("test -A")), true);
  assertEquals(labels.some((l) => l.includes("check cli/src/main.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-skills.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-agents.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-skill-sync.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-pack-refs.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-naming-prefix.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-srs-evidence.ts")), true);
});
