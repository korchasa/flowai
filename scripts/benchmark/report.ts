/**
 * Same-harness A/B aggregation + markdown rendering for the benchmark
 * (FR-BENCH-SWE).
 *
 * Both arms are Claude Code + Sonnet over ACP; the only difference is flowai.
 * We run our OWN baseline (no flowai) over a high-confidence pool, then flowai
 * over the instances the baseline actually fails. The signal is the
 * baseline-fail ∩ flowai-pass cell — instances pure Claude Code + Sonnet could
 * not solve but flowai could. Pure functions over the swebench resolved-id sets.
 */

import type { Candidate } from "./select.ts";
import type { ArmCost } from "./metrics.ts";
import type { InstanceWebAudit } from "./webaudit.ts";

export interface ABRow {
  instanceId: string;
  difficulty: string;
  repo: string;
  baseline: boolean;
  /** Whether flowai was run on this instance (only baseline-failures, by design). */
  flowaiAttempted: boolean;
  flowai: boolean;
}

export interface ABReport {
  poolTotal: number;
  baselineResolved: number;
  baselineFailed: number;
  /** flowai runs only on baseline-failures. */
  flowaiAttempted: number;
  /** baseline-fail ∩ flowai-pass — flowai's unique wins over pure Claude Code. */
  flowaiWins: string[];
  /** baseline-pass ∩ flowai-fail (attempted) — regressions, for honesty. */
  regressions: string[];
  rows: ABRow[];
}

/** Aggregate a same-harness A/B over the pool. */
export function aggregateAB(
  pool: readonly Candidate[],
  baselineResolvedIds: Iterable<string>,
  flowaiResolvedIds: Iterable<string>,
  flowaiAttemptedIds: Iterable<string>,
): ABReport {
  const bRes = new Set(baselineResolvedIds);
  const fRes = new Set(flowaiResolvedIds);
  const fAtt = new Set(flowaiAttemptedIds);

  const rows: ABRow[] = pool.map((c) => ({
    instanceId: c.instanceId,
    difficulty: c.difficulty,
    repo: c.repo,
    baseline: bRes.has(c.instanceId),
    flowaiAttempted: fAtt.has(c.instanceId),
    flowai: fRes.has(c.instanceId),
  }));

  const flowaiWins = rows
    .filter((r) => !r.baseline && r.flowaiAttempted && r.flowai)
    .map((r) => r.instanceId);
  const regressions = rows
    .filter((r) => r.baseline && r.flowaiAttempted && !r.flowai)
    .map((r) => r.instanceId);

  return {
    poolTotal: pool.length,
    baselineResolved: rows.filter((r) => r.baseline).length,
    baselineFailed: rows.filter((r) => !r.baseline).length,
    flowaiAttempted: rows.filter((r) => r.flowaiAttempted).length,
    flowaiWins,
    regressions,
    rows,
  };
}

export interface ReportMeta {
  date: string;
  model: string;
  dataset: string;
}

function mark(b: boolean): string {
  return b ? "✅" : "❌";
}

/**
 * Render the per-arm cost totals (FR-BENCH-SWE.COST). Informative only —
 * cost is measured, never a quality criterion, hence a separate section that
 * never feeds the A/B verdict.
 */
function renderCostSection(
  costs: Partial<Record<"baseline" | "flowai", ArmCost>>,
): string[] {
  const L: string[] = [];
  L.push(`## Cost (informative — never a quality criterion)`);
  L.push("");
  for (const arm of ["baseline", "flowai"] as const) {
    const c = costs[arm];
    if (!c) continue;
    const min = (c.wallClockMs / 60_000).toFixed(1);
    L.push(
      `- ${arm}: ${c.instances} instance(s) with metrics; wall-clock ${min} min` +
        ` total; ${c.apiCalls} API calls; tokens in ${c.inputTokens}` +
        ` (cache-read ${c.cacheReadTokens}, cache-write ${c.cacheCreationTokens})` +
        ` / out ${c.outputTokens}; ${c.toolCalls} tool calls` +
        (c.parseErrors > 0
          ? `; ${c.parseErrors} transcript parse error(s)`
          : "") +
        `.`,
    );
  }
  L.push(
    `- flowai's gate-emulator CLI shares bench-home, so gate tokens are counted` +
      ` inside the flowai arm's overhead.`,
  );
  L.push("");
  return L;
}

/**
 * Render the per-arm web-access audit (FR-BENCH-SWE.WEBAUDIT). Research is
 * normal agent work — accesses are totalled and only oracle-adjacent ones are
 * listed verbatim for human review; a flag is disclosure, never an exclusion.
 */
function renderWebAuditSection(
  audits: Partial<Record<"baseline" | "flowai", InstanceWebAudit[]>>,
): string[] {
  const L: string[] = [];
  L.push(`## Web access (audited — flagged, never banned)`);
  L.push("");
  for (const arm of ["baseline", "flowai"] as const) {
    const list = audits[arm];
    if (!list) continue;
    const total = list.reduce((n, a) => n + a.accesses.length, 0);
    const flagged = list.reduce((n, a) => n + a.flaggedCount, 0);
    L.push(
      `- ${arm}: ${total} access(es) across ${list.length} instance(s);` +
        ` ${flagged} flagged oracle-adjacent.`,
    );
    for (const a of list) {
      for (const acc of a.accesses) {
        if (!acc.flagged) continue;
        L.push(`  - \`${a.instanceId}\` ${acc.tool}: ${acc.target}`);
      }
    }
  }
  L.push(
    `- A flag means the target references the instance's own repo` +
      ` PR/commit/issue or its ticket number — review by hand; nothing is` +
      ` excluded automatically.`,
  );
  L.push("");
  return L;
}

/** Render a committed markdown A/B report. */
export function renderMarkdownAB(
  rep: ABReport,
  meta: ReportMeta,
  costs?: Partial<Record<"baseline" | "flowai", ArmCost>>,
  webAudits?: Partial<Record<"baseline" | "flowai", InstanceWebAudit[]>>,
): string {
  const L: string[] = [];
  L.push(`# SWE-bench Verified — flowai vs pure Claude Code (same harness)`);
  L.push("");
  L.push(`- Date: ${meta.date}`);
  L.push(`- Harness: Claude Code + \`${meta.model}\` over ACP — both arms.`);
  L.push(`- Dataset: ${meta.dataset}`);
  L.push(
    `- Pool: ${rep.poolTotal} measured-headroom instances (our Sonnet resolves` +
      ` 0–1 of 3 reps AND someone solves it on our scaffold; arm64-buildable,` +
      ` cheapest-first). See measured_headroom.json.`,
  );
  L.push(
    `- Method: run our OWN baseline (Claude Code + Sonnet, no flowai) over the` +
      ` pool; run flowai (same harness + framework) over the baseline's actual` +
      ` failures. The signal is **baseline-fail → flowai-pass**.`,
  );
  L.push("");
  L.push(`## Result`);
  L.push("");
  L.push(
    `- Baseline (pure Claude Code + Sonnet): resolved` +
      ` ${rep.baselineResolved}/${rep.poolTotal}, failed ${rep.baselineFailed}.`,
  );
  L.push(
    `- flowai on the ${rep.baselineFailed} baseline-failures` +
      ` (${rep.flowaiAttempted} attempted): **${rep.flowaiWins.length} resolved**` +
      ` — instances pure Claude Code + Sonnet could not solve but flowai could.`,
  );
  if (rep.regressions.length > 0) {
    L.push(
      `- Regressions (baseline ✅ but flowai ❌): ${rep.regressions.length}` +
        ` — ${rep.regressions.map((i) => `\`${i}\``).join(", ")}.`,
    );
  }
  L.push("");
  L.push(`### Per-instance (pool, cheapest-first)`);
  L.push("");
  L.push(`| Instance | Difficulty | baseline | flowai |`);
  L.push(`| --- | --- | :-: | :-: |`);
  for (const r of rep.rows) {
    const f = r.flowaiAttempted ? mark(r.flowai) : "—";
    L.push(
      `| \`${r.instanceId}\` | ${r.difficulty} | ${mark(r.baseline)} | ${f} |`,
    );
  }
  L.push("");
  L.push(`### flowai wins over pure Claude Code + Sonnet`);
  L.push("");
  if (rep.flowaiWins.length === 0) {
    L.push(`_None yet._`);
  } else {
    for (const id of rep.flowaiWins) L.push(`- \`${id}\``);
  }
  L.push("");
  if (costs && (costs.baseline || costs.flowai)) {
    L.push(...renderCostSection(costs));
  }
  if (webAudits && (webAudits.baseline || webAudits.flowai)) {
    L.push(...renderWebAuditSection(webAudits));
  }
  L.push(`## Caveats`);
  L.push("");
  L.push(
    `- Same-harness A/B: both arms are Claude Code + Sonnet over ACP, so a win` +
      ` isolates flowai's contribution (not a scaffold or model difference).`,
  );
  L.push(
    `- flowai is run only on baseline-failures, so the table shows "—" for` +
      ` flowai where the baseline already passed (no regression data there).`,
  );
  L.push(
    `- Single-rep, autonomous: the agent self-selects plan variants, so this` +
      ` measures flowai's autonomous workflow scaffolding, NOT its` +
      ` human-in-the-loop decision-gate value.`,
  );
  L.push(
    `- The pool was seeded from a stronger Claude Code config's failures to be` +
      ` efficient; the baseline column is our own measurement, not that seed.`,
  );
  L.push(`- All SWE-bench Verified repos are Python.`);
  return L.join("\n") + "\n";
}
