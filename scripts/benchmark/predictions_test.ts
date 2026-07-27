import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import {
  appendPrediction,
  captureDiff,
  initPredictionsFile,
  type Prediction,
  toJsonl,
  toPrediction,
} from "./predictions.ts";

async function git(dir: string, args: string[]): Promise<void> {
  const { code, stderr } = await new Deno.Command("git", {
    args: ["-C", dir, ...args],
    stdout: "null",
    stderr: "piped",
  }).output();
  if (code !== 0) {
    throw new Error(
      `git ${args.join(" ")}: ${new TextDecoder().decode(stderr)}`,
    );
  }
}

const DIFF = `diff --git a/requests/models.py b/requests/models.py
--- a/requests/models.py
+++ b/requests/models.py
@@ -1 +1 @@
-old
+new
`;

Deno.test("diff_to_prediction_jsonl: builds a valid swebench record", () => {
  const p = toPrediction("psf__requests-1142", "flowai", DIFF);
  assertEquals(p.instance_id, "psf__requests-1142");
  assertEquals(p.model_name_or_path, "flowai");
  assertEquals(p.model_patch, DIFF);
});

Deno.test("diff_to_prediction_jsonl: empty diff yields empty patch (not an error)", () => {
  const p = toPrediction("psf__requests-1142", "baseline", "");
  assertEquals(p.model_patch, "");
});

Deno.test("diff_to_prediction_jsonl: rejects blank instance id or model", () => {
  assertThrows(() => toPrediction("", "flowai", DIFF));
  assertThrows(() => toPrediction("psf__requests-1142", "", DIFF));
});

Deno.test("appendPrediction: persists one record per call, creating the file, round-trips", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const p1 = toPrediction("psf__requests-1142", "flowai", DIFF);
    const p2 = toPrediction("pallets__flask-5014", "flowai", "");
    // First call creates the file (durability after instance 1).
    const path = await appendPrediction(dir, "flowai", p1);
    assertEquals(path, join(dir, "flowai.jsonl"));
    assertEquals(
      (await Deno.readTextFile(path)).trimEnd().split("\n").length,
      1,
    );
    // Second call appends (durability after instance 2).
    await appendPrediction(dir, "flowai", p2);
    const lines = (await Deno.readTextFile(path)).trimEnd().split("\n");
    assertEquals(lines.length, 2);
    assertEquals(JSON.parse(lines[0]), p1);
    assertEquals(JSON.parse(lines[1]), p2);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("initPredictionsFile + append: truncates to EMPTY (no leading blank line) then appends cleanly", async () => {
  const dir = await Deno.makeTempDir();
  try {
    // Seed stale content to prove init truncates it.
    await Deno.writeTextFile(join(dir, "flowai.jsonl"), "stale\nstale2\n");
    const path = await initPredictionsFile(dir, "flowai");
    assertEquals(path, join(dir, "flowai.jsonl"));
    // Truncated to a genuinely empty file — NOT a single blank "\n" line.
    assertEquals(await Deno.readTextFile(path), "");

    await appendPrediction(
      dir,
      "flowai",
      toPrediction("a__a-1", "flowai", DIFF),
    );
    await appendPrediction(dir, "flowai", toPrediction("b__b-2", "flowai", ""));
    const raw = await Deno.readTextFile(path);
    // No blank lines anywhere (swebench's json.loads(line) would choke on one).
    const all = raw.split("\n");
    assertEquals(all[0] !== "", true);
    const records = raw.trimEnd().split("\n");
    assertEquals(records.length, 2);
    assertEquals(JSON.parse(records[0]).instance_id, "a__a-1");
    assertEquals(JSON.parse(records[1]).instance_id, "b__b-2");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("captureDiff: excludes agent-created env artifacts (venv, build, __pycache__) but keeps source", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await git(dir, ["init", "-q"]);
    await git(dir, ["config", "user.email", "t@t"]);
    await git(dir, ["config", "user.name", "t"]);
    // Seed a tracked source file and commit a baseline.
    await ensureDir(join(dir, "pkg"));
    await Deno.writeTextFile(join(dir, "pkg", "mod.py"), "x = 1\n");
    await git(dir, ["add", "-A"]);
    await git(dir, ["commit", "-qm", "base"]);

    // Agent edits real source AND leaves a venv + build + __pycache__ behind.
    await Deno.writeTextFile(join(dir, "pkg", "mod.py"), "x = 2\n");
    await ensureDir(join(dir, "venv", "lib"));
    await Deno.writeTextFile(join(dir, "venv", "lib", "junk.py"), "junk\n");
    await ensureDir(join(dir, "build"));
    await Deno.writeTextFile(join(dir, "build", "out.o"), "binary\n");
    await ensureDir(join(dir, "pkg", "__pycache__"));
    await Deno.writeTextFile(
      join(dir, "pkg", "__pycache__", "mod.pyc"),
      "bc\n",
    );
    // A stray pip-redirect artifact (observed: `=2.6.0,`).
    await Deno.writeTextFile(join(dir, "=2.6.0,"), "junk\n");

    const diff = await captureDiff(dir);
    assertStringIncludes(diff, "pkg/mod.py");
    assertStringIncludes(diff, "+x = 2");
    assertEquals(diff.includes("venv/"), false);
    assertEquals(diff.includes("build/"), false);
    assertEquals(diff.includes("__pycache__"), false);
    assertEquals(diff.includes("=2.6.0,"), false);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("diff_to_prediction_jsonl: jsonl is newline-delimited and round-trips", () => {
  const preds: Prediction[] = [
    toPrediction("psf__requests-1142", "flowai", DIFF),
    toPrediction("pallets__flask-5014", "flowai", ""),
  ];
  const jsonl = toJsonl(preds);
  const lines = jsonl.trimEnd().split("\n");
  assertEquals(lines.length, 2);
  for (let i = 0; i < lines.length; i++) {
    assertEquals(JSON.parse(lines[i]), preds[i]);
  }
});

/**
 * The flowai arm installs the pack into the IDE's OWN config dir — `.claude` for
 * Claude, `.codex` for codex, and so on. Excluding only `.claude` made the codex
 * arm ship the whole installed pack as its "fix": measured 2026-07-27, a smoke
 * run produced a 471 KB, 41-file patch of which every file was `.codex/skills/**`.
 * The exclusion must therefore come from the IDE registry, not from one literal.
 */
Deno.test("captureDiff: excludes EVERY IDE's config dir, not just Claude's", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await git(dir, ["init", "-q"]);
    await git(dir, ["config", "user.email", "t@t"]);
    await git(dir, ["config", "user.name", "t"]);
    await Deno.writeTextFile(join(dir, "mod.py"), "x = 1\n");
    await git(dir, ["add", "-A"]);
    await git(dir, ["commit", "-qm", "base"]);

    await Deno.writeTextFile(join(dir, "mod.py"), "x = 2\n");
    for (const cfg of [".claude", ".codex", ".cursor", ".opencode"]) {
      await ensureDir(join(dir, cfg, "skills", "plan"));
      await Deno.writeTextFile(
        join(dir, cfg, "skills", "plan", "SKILL.md"),
        "installed pack\n",
      );
    }

    const diff = await captureDiff(dir);
    assertStringIncludes(diff, "+x = 2");
    for (const cfg of [".claude", ".codex", ".cursor", ".opencode"]) {
      assertEquals(diff.includes(cfg), false, `${cfg} leaked into the patch`);
    }
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
