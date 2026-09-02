import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  collectGeneratedFiles,
  formatJudgeEvidence,
  type JudgeEvidenceParts,
  MAX_DIFF_LEN,
  MAX_TRACE_LEN,
  truncateDiff,
  truncateTrace,
} from "./evidence.ts";

function parts(over: Partial<JudgeEvidenceParts> = {}): JudgeEvidenceParts {
  return {
    expectedOutcome: "outcome",
    gitStatus: "status",
    gitLog: "log",
    committedDiff: "committed",
    workingTreeDiff: "working",
    taskFiles: "tasks",
    generatedFiles: "generated",
    ...over,
  };
}

Deno.test("formatJudgeEvidence surfaces the uncommitted working tree diff", () => {
  const out = formatJudgeEvidence(parts({
    workingTreeDiff: "+1. Run tests before committing: `poetry run pytest`",
  }));
  assertStringIncludes(
    out,
    "--- GIT DIFF (uncommitted working tree vs HEAD) ---",
  );
  assertStringIncludes(out, "poetry run pytest");
});

Deno.test("formatJudgeEvidence keeps the committed diff distinguishable from the agent's own", () => {
  const out = formatJudgeEvidence(parts({
    committedDiff: "+1. Run tests before committing: `deno test`",
    workingTreeDiff: "+1. Run tests before committing: `poetry run pytest`",
  }));
  const committedAt = out.indexOf("--- GIT DIFF (init..HEAD) ---");
  const workingAt = out.indexOf(
    "--- GIT DIFF (uncommitted working tree vs HEAD) ---",
  );
  assertEquals(committedAt < workingAt, true);
  assertStringIncludes(
    out.slice(workingAt),
    "may consist\nentirely of commits made by the scenario setup",
  );
});

Deno.test("truncateDiff elides only past the cap", () => {
  assertEquals(truncateDiff("short"), "short");
  const big = "x".repeat(MAX_DIFF_LEN + 10);
  const cut = truncateDiff(big);
  assertEquals(cut.startsWith("x".repeat(MAX_DIFF_LEN)), true);
  assertStringIncludes(cut, "[DIFF TRUNCATED]");
});

Deno.test("truncateTrace keeps every turn when the trace overflows", () => {
  // Shape of maintenance-tooling-relevance in the sweep of 2026-08-28: one huge
  // scan turn, then short interactive turns carrying the decisive evidence.
  const scan = `\n[turn 1] > /maintenance\n< ${"scan ".repeat(40_000)}\n`;
  const loop = [2, 3, 4, 5, 6].map((n) =>
    `\n[turn ${n}] > Apply fix\n< Finding ${n}: **Apply** | **Skip** | **Edit**?\n`
  ).join("");
  const tail = [7, 8, 9].map((n) =>
    `\n[turn ${n}] > Tooling Relevance\n< ${"done ".repeat(9_000)}\n`
  ).join("");
  const out = truncateTrace(scan + loop + tail, MAX_TRACE_LEN);

  for (let n = 1; n <= 9; n++) {
    assertStringIncludes(out, `[turn ${n}] > `);
  }
  assertEquals(out.split("**Apply** | **Skip** | **Edit**?").length - 1, 5);
});

Deno.test("truncateTrace leaves a trace under the cap untouched", () => {
  const small = "\n[turn 1] > hi\n< there\n";
  assertEquals(truncateTrace(small, MAX_TRACE_LEN), small);
});

Deno.test("truncateTrace falls back to head+tail when the trace has no turns", () => {
  const flat = "y".repeat(MAX_TRACE_LEN * 2);
  const out = truncateTrace(flat, MAX_TRACE_LEN);
  assertStringIncludes(out, "TRUNCATED");
  assertEquals(out.length <= MAX_TRACE_LEN + 200, true);
});

// --- collectGeneratedFiles -------------------------------------------------

async function git(cwd: string, ...args: string[]): Promise<string> {
  const out = await new Deno.Command("git", {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!out.success) {
    throw new Error(
      `git ${args.join(" ")} failed: ${new TextDecoder().decode(out.stderr)}`,
    );
  }
  return new TextDecoder().decode(out.stdout).trim();
}

async function write(root: string, rel: string, content: string) {
  const path = `${root}/${rel}`;
  await Deno.mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await Deno.writeTextFile(path, content);
}

/**
 * A sandbox the way the runner builds one: the installed framework and the
 * scenario fixture committed as `init`, then the agent's work on top of it —
 * one file modified, one committed, one left untracked inside an untracked
 * directory.
 */
async function sandboxWithAgentWork(): Promise<
  { root: string; initHash: string }
> {
  const root = await Deno.makeTempDir({ prefix: "evidence-test-" });
  await git(root, "init", "-q");
  await git(root, "config", "user.email", "t@t");
  await git(root, "config", "user.name", "t");
  await write(root, ".codex/skills/init/SKILL.md", "INSTALLED FRAMEWORK");
  await write(root, "AGENTS.md", "# original");
  await write(root, "src/untouched.ts", "UNTOUCHED FIXTURE");
  await git(root, "add", "-A");
  await git(root, "commit", "-q", "-m", "init");
  const initHash = await git(root, "rev-parse", "HEAD");

  await write(root, "AGENTS.md", "# edited by agent");
  await write(root, "scripts/check.ts", "COMMITTED BY AGENT");
  await git(root, "add", "scripts/check.ts");
  await git(root, "commit", "-q", "-m", "agent commit");
  await write(root, "documents/requirements.md", "# SRS BY AGENT");
  await write(root, "image.png", "BINARY");
  return { root, initHash };
}

Deno.test("collectGeneratedFiles carries every file the agent produced — modified, committed after init, and untracked in a new directory", async () => {
  const { root, initHash } = await sandboxWithAgentWork();
  try {
    const out = await collectGeneratedFiles(root, initHash);
    assertStringIncludes(out, "--- AGENTS.md ---\n# edited by agent");
    assertStringIncludes(out, "--- scripts/check.ts ---\nCOMMITTED BY AGENT");
    assertStringIncludes(
      out,
      "--- documents/requirements.md ---\n# SRS BY AGENT",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("collectGeneratedFiles leaves out what the harness installed — the init commit is not the agent's product and it is what crowds the product out of the cap", async () => {
  const { root, initHash } = await sandboxWithAgentWork();
  try {
    const out = await collectGeneratedFiles(root, initHash);
    assertEquals(out.includes("INSTALLED FRAMEWORK"), false);
    assertEquals(out.includes("UNTOUCHED FIXTURE"), false);
    assertEquals(out.includes("BINARY"), false);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("collectGeneratedFiles shows what the agent wrote into an IDE config dir — the primitive `engineer` produces IS the product — and hides only the IDE's own runtime state", async () => {
  // 2026-09-02 sweep: all eight `engineer-*` reds had their SKILL.md / agent
  // file / hook under `.cursor/` or `.codex/`, the GENERATED FILES section
  // was empty, and the judge scored "contents absent from evidence". The
  // installed framework is already kept out by the init commit; a blanket
  // skip of the IDE dirs hid the deliverable along with it.
  const { root, initHash } = await sandboxWithAgentWork();
  try {
    await write(root, ".codex/skills/init/SKILL.md", "EDITED FRAMEWORK");
    await write(
      root,
      ".cursor/skills/new-skill/SKILL.md",
      "NEW SKILL BY AGENT",
    );
    await write(root, ".claude/settings.local.json", "{}");
    const out = await collectGeneratedFiles(root, initHash);
    assertEquals(out.includes("EDITED FRAMEWORK"), true);
    assertEquals(out.includes("NEW SKILL BY AGENT"), true);
    assertEquals(out.includes("settings.local.json"), false);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("collectGeneratedFiles renders a generated AGENTS.md whole — the template alone is over 30 000 chars, so the old default cap elided the middle of every one", async () => {
  // 2026-09-02, `init-greenfield` re-measure: AGENTS.md on disk was 30 943
  // chars with `## Documentation Rules` at line 86; the evidence carried
  // `[HARNESS ELIDED 943 BYTES FROM THE MIDDLE OF THIS FILE]` across exactly
  // that heading and the judge scored `doc_rules_present` absent.
  const { root, initHash } = await sandboxWithAgentWork();
  try {
    const body = "## Documentation Rules\n" + "x".repeat(45_000) + "\n## End\n";
    await write(root, "AGENTS.md", body);
    const out = await collectGeneratedFiles(root, initHash);
    assertEquals(out.includes("HARNESS ELIDED"), false);
    assertEquals(out.includes("## Documentation Rules"), true);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("collectGeneratedFiles fails loudly when initHash does not resolve — an empty GENERATED FILES section would read as a behavioural red during triage", async () => {
  const { root } = await sandboxWithAgentWork();
  const bogus = "0123456789abcdef0123456789abcdef01234567";
  try {
    await assertRejects(
      () => collectGeneratedFiles(root, bogus),
      Error,
      bogus,
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("collectGeneratedFiles fails loudly on a sandbox that is not a git repository", async () => {
  const root = await Deno.makeTempDir({ prefix: "evidence-test-nogit-" });
  try {
    await write(root, "documents/requirements.md", "# SRS BY AGENT");
    await assertRejects(
      () => collectGeneratedFiles(root, "HEAD"),
      Error,
      "Git command failed",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
