import { assertEquals } from "@std/assert";
import { buildCheckPlan } from "./task-check.ts";

Deno.test("buildCheckPlan: prerequisites is empty after CLI extraction", () => {
  const plan = buildCheckPlan();
  assertEquals(plan.prerequisites.length, 0);
});

Deno.test("buildCheckPlan: parallel covers fmt + lint + tests + validators", () => {
  const plan = buildCheckPlan();
  assertEquals(plan.parallel.length >= 10, true);

  // Verify key checks are present
  const labels = plan.parallel.map((c) => c.args.join(" "));
  assertEquals(labels.some((l) => l.includes("fmt --check")), true);
  assertEquals(labels.some((l) => l.includes("lint scripts")), true);
  assertEquals(labels.some((l) => l.includes("test -A")), true);
  assertEquals(labels.some((l) => l.includes("check-skills.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-agents.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-skill-sync.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-pack-refs.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-naming-prefix.ts")), true);
  assertEquals(labels.some((l) => l.includes("check-srs-evidence.ts")), true);
  assertEquals(
    labels.some((l) => l.includes("check-trigger-coverage.ts")),
    true,
  );
  assertEquals(
    labels.some((l) => l.includes("check-task-format.ts")),
    true,
  );
});
