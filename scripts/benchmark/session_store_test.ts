import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import {
  preserveClaudeTranscripts,
  storeDirs,
  storeFiles,
} from "./session_store.ts";

Deno.test("storeDirs: codex reads sessions/, claude reads .claude/projects/", () => {
  assertEquals(storeDirs({ ide: "codex", codexHomes: ["/a/.codex"] }), [
    "/a/.codex/sessions",
  ]);
  assertEquals(storeDirs({ ide: "claude", homes: ["/h"] }), [
    "/h/.claude/projects",
  ]);
});

Deno.test("storeFiles: claude finds the main transcript and its subagents", async () => {
  const home = await Deno.makeTempDir();
  try {
    const slug = join(home, ".claude", "projects", "-tmp-sb");
    await Deno.mkdir(join(slug, "s1", "subagents"), { recursive: true });
    await Deno.writeTextFile(join(slug, "s1.jsonl"), "");
    await Deno.writeTextFile(
      join(slug, "s1", "subagents", "agent-a.jsonl"),
      "",
    );
    await Deno.writeTextFile(join(slug, "notes.txt"), "");
    const files = await storeFiles({ ide: "claude", homes: [home] });
    assertEquals(files.map((f) => f.path.slice(slug.length + 1)), [
      "s1.jsonl",
      "s1/subagents/agent-a.jsonl",
    ]);
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});

Deno.test("storeFiles: an absent directory fails fast, naming it", async () => {
  const home = await Deno.makeTempDir();
  try {
    await assertRejects(
      () => storeFiles({ ide: "claude", homes: [home] }),
      Error,
      `sessions dir absent at ${join(home, ".claude", "projects")}`,
    );
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});

// A claude subject with a codex emulator (or the reverse) leaves transcripts
// in two stores of different formats; each file keeps the IDE that wrote it.
Deno.test("storeFiles: several stores, each file tagged with its IDE", async () => {
  const root = await Deno.makeTempDir();
  try {
    await Deno.mkdir(join(root, "h", ".claude", "projects"), {
      recursive: true,
    });
    await Deno.mkdir(join(root, "c", "sessions"), { recursive: true });
    await Deno.writeTextFile(
      join(root, "h", ".claude", "projects", "a.jsonl"),
      "",
    );
    await Deno.writeTextFile(
      join(root, "c", "sessions", "rollout-b.jsonl"),
      "",
    );
    const files = await storeFiles([
      { ide: "claude", homes: [join(root, "h")] },
      { ide: "codex", codexHomes: [join(root, "c")] },
    ]);
    assertEquals(files.map((f) => f.ide), ["claude", "codex"]);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("preserveClaudeTranscripts: copies the projects tree under ~/.flowai-dev/bench/<runKey>", async () => {
  const root = await Deno.makeTempDir();
  try {
    const benchHome = join(root, "inst", "bench-home");
    const sandbox = join(root, "inst", "sandbox");
    const slug = join(benchHome, ".claude", "projects", "-sb");
    await Deno.mkdir(join(slug, "s1", "subagents"), { recursive: true });
    await Deno.writeTextFile(join(slug, "s1.jsonl"), "main");
    await Deno.writeTextFile(
      join(slug, "s1", "subagents", "agent-a.jsonl"),
      "sub",
    );
    const realHome = join(root, "home");
    const dest = await preserveClaudeTranscripts(benchHome, sandbox, realHome);
    assertEquals(
      dest?.startsWith(join(realHome, ".flowai-dev", "bench", "inst-")),
      true,
    );
    assertEquals(dest?.endsWith("/claude-projects"), true);
    assertEquals(
      await Deno.readTextFile(join(dest!, "-sb", "s1.jsonl")),
      "main",
    );
    assertEquals(
      await Deno.readTextFile(
        join(dest!, "-sb", "s1", "subagents", "agent-a.jsonl"),
      ),
      "sub",
    );
    // A resume copies again over the first copy instead of failing.
    assertEquals(
      await preserveClaudeTranscripts(benchHome, sandbox, realHome),
      dest,
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("preserveClaudeTranscripts: null when the run wrote no transcript", async () => {
  const root = await Deno.makeTempDir();
  try {
    assertEquals(
      await preserveClaudeTranscripts(join(root, "bh"), join(root, "sb"), root),
      null,
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
