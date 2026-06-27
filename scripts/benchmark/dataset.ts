/**
 * Instance metadata loader for the SWE-bench benchmark (FR-BENCH-SWE).
 *
 * The orchestrator needs each instance's repo, base commit, and issue text to
 * prepare a sandbox and prompt the agent. These come from the cached HF dataset
 * (single source of truth — no duplicated commit hashes in the repo). We read
 * them through the venv `datasets` package and return typed records.
 */

import { DATASET, VENV_PYTHON } from "./verify.ts";
import type { InstanceMeta } from "./select.ts";

export interface InstanceData {
  instanceId: string;
  repo: string;
  baseCommit: string;
  problemStatement: string;
  version: string;
}

const EXTRACT_PY = `
import json, sys
from datasets import load_dataset
ids = set(json.loads(sys.argv[1]))
ds = load_dataset("${DATASET}", split="test")
out = {}
for r in ds:
    if r["instance_id"] in ids:
        out[r["instance_id"]] = {
            "instanceId": r["instance_id"],
            "repo": r["repo"],
            "baseCommit": r["base_commit"],
            "problemStatement": r["problem_statement"],
            "version": str(r.get("version", "")),
        }
print(json.dumps(out))
`;

/** Load metadata for the given instance ids from the cached Verified dataset. */
export async function loadInstanceData(
  instanceIds: string[],
  cwd: string = Deno.cwd(),
): Promise<Map<string, InstanceData>> {
  const cmd = new Deno.Command(VENV_PYTHON, {
    args: ["-c", EXTRACT_PY, JSON.stringify(instanceIds)],
    cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code !== 0) {
    throw new Error(
      `dataset extraction failed (code ${code}): ${
        new TextDecoder().decode(stderr)
      }`,
    );
  }
  // datasets logs to stderr; stdout carries only our JSON line.
  const text = new TextDecoder().decode(stdout).trim();
  const lastLine = text.split("\n").filter((l) => l.trim()).at(-1) ?? "{}";
  const obj = JSON.parse(lastLine) as Record<string, InstanceData>;

  const map = new Map<string, InstanceData>();
  for (const id of instanceIds) {
    const rec = obj[id];
    if (!rec) throw new Error(`instance ${id} not found in ${DATASET}`);
    map.set(id, rec);
  }
  return map;
}

const META_PY = `
import json
from datasets import load_dataset
ds = load_dataset("${DATASET}", split="test")
out = []
for r in ds:
    f2p = r["FAIL_TO_PASS"]
    out.append({
        "instance_id": r["instance_id"],
        "repo": r["repo"],
        "difficulty": r.get("difficulty", ""),
        "patch_bytes": len(r["patch"]),
        "f2p": len(json.loads(f2p)) if isinstance(f2p, str) else len(f2p),
    })
print(json.dumps(out))
`;

/**
 * Dump selection metadata (difficulty, gold-patch size, FAIL_TO_PASS count) for
 * ALL dataset instances — input to `selectCandidates` when regenerating
 * candidates.json via `benchmark select`.
 */
export async function dumpAllMeta(
  cwd: string = Deno.cwd(),
): Promise<InstanceMeta[]> {
  const cmd = new Deno.Command(VENV_PYTHON, {
    args: ["-c", META_PY],
    cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code !== 0) {
    throw new Error(
      `dataset meta dump failed (code ${code}): ${
        new TextDecoder().decode(stderr)
      }`,
    );
  }
  const text = new TextDecoder().decode(stdout).trim();
  const lastLine = text.split("\n").filter((l) => l.trim()).at(-1) ?? "[]";
  return JSON.parse(lastLine) as InstanceMeta[];
}
