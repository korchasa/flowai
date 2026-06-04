import { assertEquals } from "@std/assert";
import { buildCheckPlan } from "./task-check.ts";

Deno.test("buildCheckPlan: prerequisites regenerates composite SKILL.md files", () => {
  const plan = buildCheckPlan();
  // implements [REF:fr:skill-compose | FR-SKILL-COMPOSE]
  // generator must run BEFORE any parallel check (fmt, lint, tests,
  // check-skills) so they see the rendered SKILL.md files on disk.
  const prereqLabels = plan.prerequisites.map((c) => c.args.join(" "));
  assertEquals(
    prereqLabels.some((l) =>
      l.includes("generate-skill-composites.ts") && l.includes("--write")
    ),
    true,
  );
});

Deno.test("buildCheckPlan: prerequisites build and validate plugin marketplace", () => {
  const plan = buildCheckPlan();
  const prereqLabels = plan.prerequisites.map((c) => c.args.join(" "));
  assertEquals(
    prereqLabels.some((l) => l.includes("scripts/build-plugins.ts")),
    true,
  );
  assertEquals(
    prereqLabels.some((l) => l.includes("scripts/validate-plugins.ts")),
    true,
  );
});

Deno.test("buildCheckPlan: sync-plugins-local is gated by env flag", () => {
  const withoutFlag = buildCheckPlan({ syncPluginsLocal: false });
  const withFlag = buildCheckPlan({ syncPluginsLocal: true });

  assertEquals(
    withoutFlag.prerequisites.some((c) =>
      c.args.includes("scripts/sync-plugins-local.ts")
    ),
    false,
  );
  assertEquals(
    withFlag.prerequisites.some((c) =>
      c.args.includes("scripts/sync-plugins-local.ts")
    ),
    true,
  );
});

Deno.test("buildCheckPlan: build-plugins gets --marketplace-name flowai-plugins-local when syncPluginsLocal is on", () => {
  const withFlag = buildCheckPlan({ syncPluginsLocal: true });
  const buildArgs = withFlag.prerequisites
    .find((c) =>
      c.cmd === "deno" && c.args.includes("scripts/build-plugins.ts")
    )?.args;
  assertEquals(buildArgs?.includes("--marketplace-name"), true);
  assertEquals(buildArgs?.includes("flowai-plugins-local"), true);
});

Deno.test("buildCheckPlan: build-plugins runs without --marketplace-name in default plan", () => {
  // CI / casual contributor flow MUST keep the upstream-name catalog so
  // downstream `flowai-plugins` mirror sees the unaltered build.
  const plan = buildCheckPlan();
  const buildArgs = plan.prerequisites
    .find((c) =>
      c.cmd === "deno" && c.args.includes("scripts/build-plugins.ts")
    )?.args;
  assertEquals(buildArgs?.includes("--marketplace-name"), false);
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
