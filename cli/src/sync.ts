/** Sync orchestrator — resolves IDEs, reads bundled framework, computes plan, writes files */
import { type FsAdapter, join } from "./adapters/fs.ts";
import { resolveIDEs } from "./ide.ts";
import { computePlan, planSummary } from "./plan.ts";
import {
  BundledSource,
  extractAgentNames,
  extractSkillNames,
  type FrameworkSource,
} from "./source.ts";
import { syncClaudeSymlinks } from "./symlinks.ts";
import { transformAgent } from "./transform.ts";
import { runUserSync } from "./user_sync.ts";
import type { FlowConfig, PlanItem, UpstreamFile } from "./types.ts";
import { writeFiles } from "./writer.ts";

/** Sync options */
export interface SyncOptions {
  yes: boolean;
  /** Override framework source (for testing) */
  source?: FrameworkSource;
  /** Callback to prompt user about conflicts. Returns indices to overwrite. */
  promptConflicts?: (conflicts: PlanItem[]) => Promise<number[]>;
  /** Callback for progress updates */
  onProgress?: (message: string) => void;
}

/** Sync result */
export interface SyncResult {
  totalWritten: number;
  totalSkipped: number;
  totalConflicts: number;
  errors: Array<{ path: string; error: string }>;
  symlinkResult?: { created: string[]; skipped: string[]; updated: string[] };
}

/** Execute the full sync flow */
export async function sync(
  cwd: string,
  config: FlowConfig,
  fs: FsAdapter,
  options: SyncOptions,
): Promise<SyncResult> {
  const log = options.onProgress ?? console.log;
  const result: SyncResult = {
    totalWritten: 0,
    totalSkipped: 0,
    totalConflicts: 0,
    errors: [],
  };

  // 1. Resolve IDEs
  const ides = await resolveIDEs(
    config.ides.length > 0 ? config.ides : undefined,
    cwd,
    fs,
  );

  if (ides.length === 0) {
    throw new Error(
      "No IDEs detected. Create .cursor/, .claude/, or .opencode/ directory first.",
    );
  }

  log(`Target IDEs: ${ides.map((i) => i.name).join(", ")}`);

  // 2. Load framework files from bundle
  log("Loading framework files...");
  const source = options.source ?? await BundledSource.load();

  try {
    const allPaths = await source.listFiles("framework/");

    // 3. Determine skills/agents to sync
    const allSkillNames = extractSkillNames(allPaths);
    const skillNames = filterNames(
      allSkillNames,
      config.skills.include,
      config.skills.exclude,
    );

    log(
      `Skills to sync: ${
        skillNames.length > 0 ? skillNames.join(", ") : "(none)"
      }`,
    );

    // 3b. Determine agents to sync (flat structure, same for all IDEs)
    const allAgentNames = extractAgentNames(allPaths);
    const agentNames = filterNames(
      allAgentNames,
      config.agents.include,
      config.agents.exclude,
    );

    log(
      `Agents to sync: ${
        agentNames.length > 0 ? agentNames.join(", ") : "(none)"
      }`,
    );

    // 4. Download and sync for each IDE
    for (const ide of ides) {
      log(`\nSyncing to ${ide.name}...`);

      // Skills
      if (skillNames.length > 0) {
        const skillFiles = await readSkillFiles(
          skillNames,
          allPaths,
          source,
        );
        const skillTargetDir = join(cwd, ide.configDir, "skills");
        const skillPlan = await computePlan(
          skillFiles,
          skillTargetDir,
          "skill",
          fs,
        );

        await processPlan(skillPlan, fs, options, result, log);
      }

      // Agents (read from flat path, transform per IDE)
      if (agentNames.length > 0) {
        const agentFiles = await readAgentFiles(
          agentNames,
          ide.name,
          allPaths,
          source,
        );
        const agentTargetDir = join(cwd, ide.configDir, "agents");
        const agentPlan = await computePlan(
          agentFiles,
          agentTargetDir,
          "agent",
          fs,
        );

        await processPlan(agentPlan, fs, options, result, log);
      }
    }

    // 5a. Cross-IDE user resource sync
    if (config.userSync) {
      log("\nSyncing user resources across IDEs...");
      const fwNames = new Set([...allSkillNames, ...allAgentNames]);
      const userResult = await runUserSync(
        cwd,
        ides,
        config,
        fs,
        options,
        log,
        fwNames,
      );
      result.totalWritten += userResult.totalWritten;
      result.totalSkipped += userResult.totalSkipped;
      result.totalConflicts += userResult.totalConflicts;
      result.errors.push(...userResult.errors);
    }

    // 5b. CLAUDE.md symlinks
    const hasClaudeIDE = ides.some((i) => i.name === "claude");
    if (hasClaudeIDE) {
      log("\nSyncing CLAUDE.md symlinks...");
      const symlinkResult = await syncClaudeSymlinks(cwd, fs);
      result.symlinkResult = symlinkResult;

      if (symlinkResult.created.length > 0) {
        log(`  Created ${symlinkResult.created.length} symlink(s)`);
      }
      if (symlinkResult.updated.length > 0) {
        log(`  Updated ${symlinkResult.updated.length} symlink(s)`);
      }
      if (symlinkResult.skipped.length > 0) {
        log(
          `  Skipped ${symlinkResult.skipped.length} (CLAUDE.md exists as regular file)`,
        );
      }
    }
  } finally {
    // Cleanup only if we created the source (not injected via options)
    if (!options.source) {
      await source.dispose();
    }
  }

  return result;
}

/** Process a plan: handle conflicts, write files */
export async function processPlan(
  plan: PlanItem[],
  fs: FsAdapter,
  options: SyncOptions,
  result: SyncResult,
  log: (msg: string) => void,
): Promise<void> {
  const summary = planSummary(plan);

  if (summary.create > 0) log(`  Create: ${summary.create}`);
  if (summary.ok > 0) log(`  Unchanged: ${summary.ok}`);
  if (summary.conflict > 0) log(`  Conflicts: ${summary.conflict}`);

  // Handle conflicts
  const conflicts = plan.filter((i) => i.action === "conflict");
  if (conflicts.length > 0 && !options.yes) {
    if (options.promptConflicts) {
      const overwriteIndices = await options.promptConflicts(conflicts);
      // Mark non-selected conflicts as "ok" (skip)
      for (let i = 0; i < conflicts.length; i++) {
        if (!overwriteIndices.includes(i)) {
          const item = conflicts[i];
          const planIdx = plan.indexOf(item);
          plan[planIdx] = { ...item, action: "ok" };
          result.totalSkipped++;
        }
      }
      result.totalConflicts += overwriteIndices.length;
    } else {
      // No prompt handler, skip all conflicts
      for (const item of conflicts) {
        const planIdx = plan.indexOf(item);
        plan[planIdx] = { ...item, action: "ok" };
        result.totalSkipped++;
      }
    }
  } else if (conflicts.length > 0) {
    // --yes mode: overwrite all
    result.totalConflicts += conflicts.length;
  }

  const writeResult = await writeFiles(plan, fs);
  result.totalWritten += writeResult.written;
  result.totalSkipped += writeResult.skipped;
  result.errors.push(...writeResult.errors);
}

/** Read skill files from framework source */
async function readSkillFiles(
  skillNames: string[],
  allPaths: string[],
  source: FrameworkSource,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  for (const name of skillNames) {
    const prefix = `framework/skills/${name}/`;
    const paths = allPaths.filter((p) => p.startsWith(prefix));
    for (const path of paths) {
      const content = await source.readFile(path);
      const relativePath = path.substring("framework/skills/".length);
      files.push({ path: relativePath, content });
    }
  }
  return files;
}

/** Read agent files from flat framework/agents/ and transform for target IDE */
async function readAgentFiles(
  agentNames: string[],
  ideName: string,
  allPaths: string[],
  source: FrameworkSource,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  for (const name of agentNames) {
    const agentPath = `framework/agents/${name}.md`;
    if (allPaths.includes(agentPath)) {
      const raw = await source.readFile(agentPath);
      const content = transformAgent(raw, ideName);
      files.push({ path: `${name}.md`, content });
    }
  }
  return files;
}

/** Filter names by include/exclude lists */
export function filterNames(
  all: string[],
  include: string[],
  exclude: string[],
): string[] {
  if (include.length > 0) {
    return all.filter((n) => include.includes(n));
  }
  if (exclude.length > 0) {
    return all.filter((n) => !exclude.includes(n));
  }
  return all;
}
