/**
 * Retro-classification of graded benchmark runs (FR-BENCH-SWE.P2P).
 *
 * swebench's `resolved` verdict is already the conjunction "all FAIL_TO_PASS
 * pass ∧ all PASS_TO_PASS pass", but the A/B report shows only the headline —
 * "solved but broke existing tests" is indistinguishable from "not solved".
 * This module re-reads the per-instance `report.json` files that
 * `swebench.harness.run_evaluation` leaves under
 * `logs/run_evaluation/<runId>/<arm>/<instance>/` and decomposes every grade
 * into the two v1-endpoint components (`solved` := F2P all pass;
 * `no-regression` := P2P no failures) — past campaigns are recomputable from
 * disk without a single LLM call. Test outcomes themselves are never
 * re-derived in TS; we only re-read swebench's own verdict files.
 */

import { join } from "@std/path";

export type GradeClass =
  | "clean" // solved ∧ no-regression (== swebench `resolved`)
  | "solved-broke" // F2P all pass, but P2P failures — previously invisible
  | "unsolved" // patch applied, F2P failures remain
  | "no-patch" // empty/absent patch
  | "apply-failed" // patch did not apply
  | "ungraded"; // report exists but carries no F2P outcome

export const GRADE_CLASSES: readonly GradeClass[] = [
  "clean",
  "solved-broke",
  "unsolved",
  "no-patch",
  "apply-failed",
  "ungraded",
];

export interface InstanceGrade {
  runId: string;
  arm: string;
  instanceId: string;
  /** swebench's own verdict, as read from the report. */
  resolved: boolean;
  /** F2P: no failures and at least one success. */
  solved: boolean;
  /** P2P: no failures. */
  noRegression: boolean;
  f2pPass: number;
  f2pFail: number;
  p2pPass: number;
  p2pFail: number;
  p2pFailedTests: string[];
  klass: GradeClass;
  /** Derived `clean` disagrees with swebench `resolved` — surfaced loudly. */
  resolvedMismatch: boolean;
}

interface TestBucket {
  success: string[];
  failure: string[];
}

function bucket(v: unknown): TestBucket {
  const o = (typeof v === "object" && v !== null ? v : {}) as Record<
    string,
    unknown
  >;
  const arr = (k: string): string[] =>
    Array.isArray(o[k]) ? (o[k] as unknown[]).map(String) : [];
  return { success: arr("success"), failure: arr("failure") };
}

/**
 * Classify one instance record out of a swebench per-instance `report.json`
 * (an object keyed by instance id). Fails fast on a missing key.
 */
export function classifyReport(
  runId: string,
  arm: string,
  instanceId: string,
  reportJson: unknown,
): InstanceGrade {
  const root =
    (typeof reportJson === "object" && reportJson !== null
      ? reportJson
      : {}) as Record<string, unknown>;
  const rec = root[instanceId] as Record<string, unknown> | undefined;
  if (rec === undefined) {
    throw new Error(
      `report.json has no record for instance '${instanceId}' (run ${runId}, arm ${arm})`,
    );
  }

  const resolved = rec.resolved === true;
  const tests = (rec.tests_status ?? undefined) as
    | Record<string, unknown>
    | undefined;
  const f2p = bucket(tests?.FAIL_TO_PASS);
  const p2p = bucket(tests?.PASS_TO_PASS);
  const solved = f2p.failure.length === 0 && f2p.success.length > 0;
  const noRegression = p2p.failure.length === 0;

  let klass: GradeClass;
  if (rec.patch_is_None === true || rec.patch_exists === false) {
    klass = "no-patch";
  } else if (rec.patch_successfully_applied === false) {
    klass = "apply-failed";
  } else if (
    tests === undefined ||
    (f2p.success.length === 0 && f2p.failure.length === 0)
  ) {
    klass = "ungraded";
  } else if (!solved) {
    klass = "unsolved";
  } else {
    klass = noRegression ? "clean" : "solved-broke";
  }

  return {
    runId,
    arm,
    instanceId,
    resolved,
    solved,
    noRegression,
    f2pPass: f2p.success.length,
    f2pFail: f2p.failure.length,
    p2pPass: p2p.success.length,
    p2pFail: p2p.failure.length,
    p2pFailedTests: p2p.failure,
    klass,
    resolvedMismatch: (klass === "clean") !== resolved,
  };
}

/**
 * Scan one graded run: `<evalRoot>/<runId>/<arm>/<instanceId>/report.json`.
 * Fails fast when the run dir is absent (a typo'd run id must not read as
 * "0 grades").
 */
export async function scanRun(
  evalRoot: string,
  runId: string,
): Promise<InstanceGrade[]> {
  const runDir = join(evalRoot, runId);
  try {
    await Deno.stat(runDir);
  } catch {
    throw new Error(`run dir not found: ${runDir} (run id '${runId}')`);
  }
  const grades: InstanceGrade[] = [];
  for await (const armEntry of Deno.readDir(runDir)) {
    if (!armEntry.isDirectory) continue;
    const armDir = join(runDir, armEntry.name);
    for await (const instEntry of Deno.readDir(armDir)) {
      if (!instEntry.isDirectory) continue;
      const reportPath = join(armDir, instEntry.name, "report.json");
      let raw: string;
      try {
        raw = await Deno.readTextFile(reportPath);
      } catch {
        continue; // instance dir without a report (grading error) — skip
      }
      grades.push(
        classifyReport(runId, armEntry.name, instEntry.name, JSON.parse(raw)),
      );
    }
  }
  grades.sort((a, b) =>
    a.arm.localeCompare(b.arm) || a.instanceId.localeCompare(b.instanceId)
  );
  return grades;
}

function countByClass(grades: InstanceGrade[]): string {
  const counts = GRADE_CLASSES
    .map((k) => [k, grades.filter((g) => g.klass === k).length] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k} ${n}`)
    .join(", ");
  return `${counts || "nothing graded"} (${grades.length} grades)`;
}

/** Render the retro decomposition as a committed-report-grade markdown. */
export function renderRetroMarkdown(
  grades: InstanceGrade[],
  meta: { title: string },
): string {
  const L: string[] = [];
  L.push(`# ${meta.title}`);
  L.push("");
  L.push(
    `Regression decomposition retro-computed from per-instance swebench` +
      ` \`report.json\` files (FR-BENCH-SWE.P2P) — zero LLM calls.` +
      ` \`clean\` = solved ∧ no-regression; \`solved-broke\` = gold F2P pass` +
      ` but pre-existing P2P tests broken.`,
  );
  L.push("");

  const arms = [...new Set(grades.map((g) => g.arm))].sort();
  for (const arm of arms) {
    const armGrades = grades.filter((g) => g.arm === arm);
    L.push(`## Arm: ${arm}`);
    L.push("");
    L.push(`- Total: ${countByClass(armGrades)}`);
    const runs = [...new Set(armGrades.map((g) => g.runId))].sort();
    if (runs.length > 1) {
      for (const run of runs) {
        L.push(
          `  - ${run}: ${
            countByClass(armGrades.filter((g) => g.runId === run))
          }`,
        );
      }
    }
    const broke = armGrades.filter((g) => g.klass === "solved-broke");
    if (broke.length > 0) {
      L.push(`- Solved-but-broke (the previously invisible class):`);
      for (const g of broke) {
        const shown = g.p2pFailedTests.slice(0, 5);
        const more = g.p2pFailedTests.length - shown.length;
        L.push(
          `  - \`${g.instanceId}\` (${g.runId}): broke ${g.p2pFail} P2P test(s):` +
            ` ${shown.join(", ")}${more > 0 ? ` (+${more} more)` : ""}`,
        );
      }
    }
    L.push("");
  }

  const mismatches = grades.filter((g) => g.resolvedMismatch);
  L.push(`## Sanity: derived-clean vs swebench-resolved mismatch`);
  L.push("");
  if (mismatches.length === 0) {
    L.push(`- None — decomposition agrees with every swebench verdict.`);
  } else {
    for (const g of mismatches) {
      L.push(
        `- MISMATCH \`${g.instanceId}\` (${g.runId}/${g.arm}): derived` +
          ` ${g.klass}, swebench resolved=${g.resolved} — inspect before` +
          ` trusting either number.`,
      );
    }
  }
  return L.join("\n") + "\n";
}
