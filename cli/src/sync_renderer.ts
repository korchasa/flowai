/** Instruction-oriented renderer for `flowai sync` output. */
import { detectColor, red } from "./color.ts";
import type { ResourceAction } from "./types.ts";
import type { SyncResult } from "./sync.ts";

/** Options for renderSyncOutput. `color` overrides auto-detection (NO_COLOR
 * + stdout.isTerminal); undefined means auto-detect. */
export interface RenderOptions {
  color?: boolean;
}

interface ResourceSection {
  label: string;
  items: ResourceAction[];
  artifactLabel: string;
  hints: { update: string; create: string; delete: string };
}

/** Build the static description of resource sections from a sync result. */
function buildResourceSections(result: SyncResult): ResourceSection[] {
  return [
    {
      label: "SKILLS",
      items: result.skillActions,
      artifactLabel: "scaffolds",
      hints: {
        update:
          "For each skill with scaffolds: compare the updated template against the project artifact using git diff on the skill directory.",
        create: "No migration needed for new skills.",
        delete: "Check if deleted skills are referenced in project docs.",
      },
    },
    {
      label: "AGENTS",
      items: result.agentActions,
      artifactLabel: "",
      hints: {
        update: "Check if agent prompts are referenced in project docs.",
        create: "New agents installed.",
        delete: "Check if deleted agents are referenced in project docs.",
      },
    },
    {
      label: "HOOKS",
      items: result.hookActions,
      artifactLabel: "",
      hints: {
        update: "",
        create: "IDE hook configuration auto-generated.",
        delete: "Removed from IDE hook configuration.",
      },
    },
    {
      label: "ASSETS",
      items: result.assetActions,
      artifactLabel: "artifacts",
      hints: {
        update:
          "For each updated asset: compare the template against the project artifact.",
        create: "New asset templates installed.",
        delete: "",
      },
    },
  ];
}

function groupByAction(
  actions: ResourceAction[],
): Record<"create" | "update" | "delete" | "ok", ResourceAction[]> {
  const groups: Record<string, ResourceAction[]> = {
    create: [],
    update: [],
    delete: [],
    ok: [],
  };
  for (const a of actions) {
    (groups[a.action] ?? groups.ok).push(a);
  }
  return groups as Record<
    "create" | "update" | "delete" | "ok",
    ResourceAction[]
  >;
}

/** Build the numbered ACTIONS REQUIRED list (config migration + per-section
 * create/update/delete entries). Failed items are excluded so counters report
 * what was actually written. Returned strings are pre-numbered. */
function buildActionEntries(
  result: SyncResult,
  sections: ResourceSection[],
): string[] {
  const actions: string[] = [];
  let actionNum = 0;
  const push = (text: string) => {
    actionNum++;
    actions.push(`${actionNum}. ${text}`);
  };

  if (result.configMigrated) {
    const m = result.configMigrated;
    push(
      `CONFIG MIGRATED (v${m.from} -> v${m.to}):\n` +
        `   .flowai.yaml updated with packs: ${m.packs.join(", ")}.\n` +
        `   Commit this file.`,
    );
  }

  for (const { label, items, artifactLabel, hints } of sections) {
    const grouped = groupByAction(items);
    for (const action of ["update", "create", "delete"] as const) {
      const list = grouped[action];
      if (list.length === 0) continue;
      // Failed items are excluded from the visible list and subtracted from
      // the written count so CREATED (N) reports reality, not intent.
      const written = list.filter((r) => !r.failed);
      const planned = list.length;
      if (written.length === 0) continue; // every item failed — skip section
      const verb = action === "create" && label === "HOOKS"
        ? "INSTALLED"
        : action.toUpperCase() + "D";
      const countStr = written.length === planned
        ? `${planned}`
        : `${written.length}/${planned}`;
      const lines = written.map((r) => {
        const suffix = artifactLabel && r.scaffolds.length > 0
          ? ` (${artifactLabel}: ${r.scaffolds.join(", ")})`
          : "";
        return `   - ${r.name}${suffix}`;
      });
      const hint = hints[action];
      push(
        `${label} ${verb} (${countStr}):\n` + lines.join("\n") +
          (hint ? "\n   " + hint : ""),
      );
    }
  }

  return actions;
}

/** Print the truthful header line: success or red FAILED summary. */
function printSyncHeader(result: SyncResult, color: boolean): void {
  const dryPrefix = result.dryRun ? "[DRY RUN] " : "";
  if (result.errors.length > 0) {
    console.log(
      "\n" +
        red(
          `${dryPrefix}flowai sync FAILED: ${result.errors.length} error(s).`,
          color,
        ),
    );
  } else {
    console.log(`\n${dryPrefix}flowai sync complete.`);
  }
}

/** Print the ACTIONS REQUIRED block followed by the NO ACTIONS summary. */
function printActionsAndSummary(
  actions: string[],
  sections: ResourceSection[],
  hasErrors: boolean,
): void {
  if (actions.length > 0) {
    console.log("\n>>> ACTIONS REQUIRED:\n");
    console.log(actions.join("\n\n"));
  }

  const noActionParts: string[] = [];
  for (const { label, items } of sections) {
    const okCount = items.filter((a) => a.action === "ok").length;
    if (okCount > 0) {
      noActionParts.push(`${okCount} ${label.toLowerCase()} unchanged`);
    }
  }

  if (actions.length === 0 && !hasErrors) {
    console.log("\n>>> NO ACTIONS REQUIRED.");
    if (noActionParts.length > 0) {
      console.log(`${noActionParts.join(", ")}.`);
    }
  } else if (noActionParts.length > 0) {
    console.log(`\n>>> NO ACTIONS REQUIRED:\n${noActionParts.join(", ")}.`);
  }
}

/** Print the trailing ERRORS block + symlink informational summary. */
function printTrailers(result: SyncResult, color: boolean): void {
  if (result.errors.length > 0) {
    console.log("\n" + red(`>>> ERRORS (${result.errors.length}):`, color));
    for (const e of result.errors) {
      console.log(red(`   - ${e.path}: ${e.error}`, color));
    }
  }

  if (result.symlinkResult) {
    const sl = result.symlinkResult;
    if (sl.created.length > 0 || sl.updated.length > 0) {
      console.log(
        `\nCLAUDE.md symlinks: ${sl.created.length} created, ${sl.updated.length} updated.`,
      );
    }
  }
}

/** Render instruction-oriented sync output.
 *
 * Layout:
 *   1. Truthful header — "flowai sync complete." (success) or
 *      "flowai sync FAILED: N error(s)." (red).
 *   2. ACTIONS REQUIRED — numbered list of resource changes. Failed items
 *      are excluded here and counters show `written/planned` when they differ.
 *   3. NO ACTIONS REQUIRED summary (unchanged resource counts).
 *   4. ERRORS block (red) — failed writes, at the very end so they're the
 *      last thing the user sees. */
export function renderSyncOutput(
  result: SyncResult,
  options: RenderOptions = {},
): void {
  const color = options.color ?? detectColor();
  printSyncHeader(result, color);
  const sections = buildResourceSections(result);
  const actions = buildActionEntries(result, sections);
  printActionsAndSummary(actions, sections, result.errors.length > 0);
  printTrailers(result, color);
}
