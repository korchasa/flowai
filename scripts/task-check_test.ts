import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildCheckPlan, denoVersionMismatch } from "./task-check.ts";

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

// [REF:fr:cicd | FR-CICD.DENO-PIN] — the running Deno must equal .dvmrc,
// because deno.lock content depends on the version that writes it.
Deno.test("denoVersionMismatch: equal versions pass", () => {
  assertEquals(denoVersionMismatch("2.9.7", "2.9.7\n"), null);
});

Deno.test("denoVersionMismatch: a leading v in .dvmrc is accepted", () => {
  assertEquals(denoVersionMismatch("2.9.7", "v2.9.7"), null);
});

Deno.test("denoVersionMismatch: a patch-level difference fails and names both versions", () => {
  const message = denoVersionMismatch("2.9.8", "2.9.7\n");
  assertEquals(typeof message, "string");
  assertStringIncludes(message!, "2.9.8");
  assertStringIncludes(message!, "2.9.7");
  assertStringIncludes(message!, ".dvmrc");
});

Deno.test("denoVersionMismatch: an empty .dvmrc fails", () => {
  const message = denoVersionMismatch("2.9.7", "  \n");
  assertEquals(typeof message, "string");
  assertStringIncludes(message!, ".dvmrc");
});
