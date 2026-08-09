/**
 * ACP isolation/auth tests (FR-ACCEPT-ISOLATION, FR-ACCEPT.ACP).
 *
 * Deterministic, offline. Proves the structural invariant: the ACP Claude
 * launch builds an isolated bench-home whose `.claude/skills/` is EMPTY (so
 * sandbox-level skills win over the user-level `~/.claude/skills/` snapshot via
 * the Skill tool resolution path) AND never reads or writes the user-level
 * `~/.claude/skills/` (byte-identical before/after).
 *
 * The behavioural half — a real ACP agent actually loading the sandbox SKILL.md
 * — is covered by the Phase-0 spike (which ran under this exact bench-home) and
 * re-verified at the manual per-IDE green gate (DoD 7).
 */
import { assert, assertEquals } from "@std/assert";
import { join } from "@std/path";
import {
  prepareAcpClaudeHome,
  prepareAcpCodexHome,
  prepareEmulatorCodexHome,
} from "./auth.ts";

/** Recursively snapshots a dir as a sorted map of relpath → contents. */
async function snapshot(root: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  async function walk(dir: string, prefix: string): Promise<void> {
    for await (const e of Deno.readDir(dir)) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      const abs = join(dir, e.name);
      if (e.isDirectory) {
        await walk(abs, rel);
      } else {
        out[rel] = await Deno.readTextFile(abs);
      }
    }
  }
  await walk(root, "");
  return out;
}

Deno.test("sandbox skills win and user-level skills dir untouched", async () => {
  const realHome = Deno.env.get("HOME");
  const fakeHome = await Deno.makeTempDir({ prefix: "acp-auth-home-" });
  const workDir = await Deno.makeTempDir({ prefix: "acp-auth-work-" });
  const sandboxPath = join(workDir, "sandbox");
  await Deno.mkdir(sandboxPath, { recursive: true });

  // Seed a user-level skills snapshot that MUST stay byte-identical.
  const userSkills = join(fakeHome, ".claude", "skills", "installed-skill");
  await Deno.mkdir(userSkills, { recursive: true });
  await Deno.writeTextFile(join(userSkills, "SKILL.md"), "# user-level v1\n");
  const before = await snapshot(join(fakeHome, ".claude", "skills"));

  Deno.env.set("HOME", fakeHome);
  try {
    const env = await prepareAcpClaudeHome(sandboxPath);

    // bench-home is a SIBLING of the sandbox, and HOME points at it.
    const benchHome = join(workDir, "bench-home");
    assertEquals(env.HOME, benchHome);

    // Its `.claude/skills/` exists and is EMPTY — sandbox skills win.
    const benchSkills = join(benchHome, ".claude", "skills");
    let count = 0;
    for await (const _ of Deno.readDir(benchSkills)) count++;
    assertEquals(count, 0, "bench-home .claude/skills must be empty");

    // The user-level skills snapshot is untouched.
    const after = await snapshot(join(fakeHome, ".claude", "skills"));
    assertEquals(
      after,
      before,
      "user-level ~/.claude/skills must be byte-identical",
    );
    assert(env.HOME !== fakeHome, "must isolate HOME away from the real one");
  } finally {
    if (realHome !== undefined) Deno.env.set("HOME", realHome);
    else Deno.env.delete("HOME");
    await Deno.remove(fakeHome, { recursive: true });
    await Deno.remove(workDir, { recursive: true });
  }
});

Deno.test("auth-related symlinks track host: present iff source exists", async () => {
  const realHome = Deno.env.get("HOME");
  const fakeHome = await Deno.makeTempDir({ prefix: "acp-auth-home-" });
  const workDir = await Deno.makeTempDir({ prefix: "acp-auth-work-" });
  const sandboxPath = join(workDir, "sandbox");
  await Deno.mkdir(sandboxPath, { recursive: true });

  // Seed ONLY Library/Keychains on the fake host; leave .local/share/claude
  // absent so we can assert the present-iff-source-exists contract.
  await Deno.mkdir(join(fakeHome, "Library", "Keychains"), { recursive: true });

  Deno.env.set("HOME", fakeHome);
  try {
    const env = await prepareAcpClaudeHome(sandboxPath);
    const benchHome = env.HOME;

    // Source present → symlink created in bench-home.
    const keychains = await Deno.lstat(join(benchHome, "Library", "Keychains"));
    assert(keychains.isSymlink, "Library/Keychains must be a symlink");

    // Source absent → no symlink (skipped, not a dangling link).
    let claudeLinkExists = true;
    try {
      await Deno.lstat(join(benchHome, ".local", "share", "claude"));
    } catch {
      claudeLinkExists = false;
    }
    assert(
      !claudeLinkExists,
      ".local/share/claude must be skipped when host source is absent",
    );
  } finally {
    if (realHome !== undefined) Deno.env.set("HOME", realHome);
    else Deno.env.delete("HOME");
    await Deno.remove(fakeHome, { recursive: true });
    await Deno.remove(workDir, { recursive: true });
  }
});

/**
 * Codex isolation (FR-BENCH-SWE.IDE). Two leaks make an un-isolated codex run
 * unusable as a benchmark arm, and both are live on the maintainer's host:
 * `~/.codex/skills/` holds user-level skills that would shadow the sandbox pack
 * (the codex twin of FR-ACCEPT-ISOLATION), and `~/.codex/config.toml` globally
 * sets `model_reasoning_effort`/`model` — the exact operator-shell leak the
 * effort invariant (FR-BENCH-SWE.SYMMETRY) forbids.
 */
Deno.test("codex bench-home isolates user skills AND user config", async () => {
  const realHome = Deno.env.get("HOME");
  const fakeHome = await Deno.makeTempDir({ prefix: "acp-codex-home-" });
  const workDir = await Deno.makeTempDir({ prefix: "acp-codex-work-" });
  const sandboxPath = join(workDir, "sandbox");
  await Deno.mkdir(sandboxPath, { recursive: true });

  // Seed the two things that MUST NOT reach the bench session.
  const userSkills = join(fakeHome, ".codex", "skills", "installed-skill");
  await Deno.mkdir(userSkills, { recursive: true });
  await Deno.writeTextFile(join(userSkills, "SKILL.md"), "# user-level v1\n");
  await Deno.writeTextFile(
    join(fakeHome, ".codex", "config.toml"),
    `model = "gpt-5.6-sol"\nmodel_reasoning_effort = "ultra"\n`,
  );
  const before = await snapshot(join(fakeHome, ".codex", "skills"));

  Deno.env.set("HOME", fakeHome);
  try {
    const env = await prepareAcpCodexHome(sandboxPath);

    // CODEX_HOME lives inside the bench-home, away from the real one.
    assertEquals(env.CODEX_HOME, join(workDir, "bench-home", ".codex"));
    assert(
      !env.CODEX_HOME.startsWith(join(fakeHome, ".codex")),
      "CODEX_HOME must not point into the user's real ~/.codex",
    );

    // Skills dir exists and is EMPTY — the sandbox pack wins.
    let count = 0;
    for await (const _ of Deno.readDir(join(env.CODEX_HOME, "skills"))) count++;
    assertEquals(count, 0, "bench CODEX_HOME/skills must be empty");

    // The user's config.toml is NOT mirrored: its effort/model must not leak.
    let configLeaked = true;
    try {
      await Deno.lstat(join(env.CODEX_HOME, "config.toml"));
    } catch {
      configLeaked = false;
    }
    assert(
      !configLeaked,
      "user config.toml must not reach the bench — it pins effort and model",
    );

    // The user-level skills snapshot is untouched.
    assertEquals(
      await snapshot(join(fakeHome, ".codex", "skills")),
      before,
      "user-level ~/.codex/skills must be byte-identical",
    );
  } finally {
    if (realHome !== undefined) Deno.env.set("HOME", realHome);
    else Deno.env.delete("HOME");
    await Deno.remove(fakeHome, { recursive: true });
    await Deno.remove(workDir, { recursive: true });
  }
});

Deno.test("codex auth.json is linked so subscription login survives", async () => {
  const realHome = Deno.env.get("HOME");
  const fakeHome = await Deno.makeTempDir({ prefix: "acp-codex-home-" });
  const workDir = await Deno.makeTempDir({ prefix: "acp-codex-work-" });
  const sandboxPath = join(workDir, "sandbox");
  await Deno.mkdir(sandboxPath, { recursive: true });

  await Deno.mkdir(join(fakeHome, ".codex"), { recursive: true });
  await Deno.writeTextFile(
    join(fakeHome, ".codex", "auth.json"),
    `{"tokens":{"access_token":"chatgpt-plan"}}`,
  );

  Deno.env.set("HOME", fakeHome);
  try {
    const env = await prepareAcpCodexHome(sandboxPath);
    const link = join(env.CODEX_HOME, "auth.json");
    assert((await Deno.lstat(link)).isSymlink, "auth.json must be a symlink");
    // Reads through to the real credentials → subscription auth works.
    assertEquals(
      JSON.parse(await Deno.readTextFile(link)).tokens.access_token,
      "chatgpt-plan",
    );
  } finally {
    if (realHome !== undefined) Deno.env.set("HOME", realHome);
    else Deno.env.delete("HOME");
    await Deno.remove(fakeHome, { recursive: true });
    await Deno.remove(workDir, { recursive: true });
  }
});

Deno.test("codex home also carries HOME — the judge stays on Claude", async () => {
  const realHome = Deno.env.get("HOME");
  const fakeHome = await Deno.makeTempDir({ prefix: "acp-codex-home-" });
  const workDir = await Deno.makeTempDir({ prefix: "acp-codex-work-" });
  const sandboxPath = join(workDir, "sandbox");
  await Deno.mkdir(sandboxPath, { recursive: true });

  Deno.env.set("HOME", fakeHome);
  try {
    const env = await prepareAcpCodexHome(sandboxPath);
    // The gate/answer judge shells out to `claude -p` even when the agent under
    // test is codex, so it needs the same isolated Claude bench-home — without
    // it the developer's ~/.claude/CLAUDE.md leaks into judge replies.
    assertEquals(env.HOME, join(workDir, "bench-home"));
    let count = 0;
    for await (
      const _ of Deno.readDir(join(env.HOME, ".claude", "skills"))
    ) count++;
    assertEquals(count, 0, "the judge's .claude/skills must be empty too");
  } finally {
    if (realHome !== undefined) Deno.env.set("HOME", realHome);
    else Deno.env.delete("HOME");
    await Deno.remove(fakeHome, { recursive: true });
    await Deno.remove(workDir, { recursive: true });
  }
});

Deno.test("never mirrors .credentials.json into bench-home", async () => {
  const realHome = Deno.env.get("HOME");
  const fakeHome = await Deno.makeTempDir({ prefix: "acp-auth-home-" });
  const workDir = await Deno.makeTempDir({ prefix: "acp-auth-work-" });
  const sandboxPath = join(workDir, "sandbox");
  await Deno.mkdir(sandboxPath, { recursive: true });

  // Seed a host credentials file — letting Keychain win avoids stale-refresh
  // 400s, so this file must NEVER be copied or symlinked into the bench-home.
  await Deno.mkdir(join(fakeHome, ".claude"), { recursive: true });
  await Deno.writeTextFile(
    join(fakeHome, ".claude", ".credentials.json"),
    `{"token":"secret"}`,
  );

  Deno.env.set("HOME", fakeHome);
  try {
    const env = await prepareAcpClaudeHome(sandboxPath);
    let mirrored = true;
    try {
      await Deno.lstat(join(env.HOME, ".claude", ".credentials.json"));
    } catch {
      mirrored = false;
    }
    assert(!mirrored, ".credentials.json must not be mirrored into bench-home");
  } finally {
    if (realHome !== undefined) Deno.env.set("HOME", realHome);
    else Deno.env.delete("HOME");
    await Deno.remove(fakeHome, { recursive: true });
    await Deno.remove(workDir, { recursive: true });
  }
});

/**
 * implements [FR-BENCH-SWE.ISOLATION]: the human emulator gets its OWN codex
 * config root, so the environment handed to it never names the agent's session
 * store — and vice versa. Before this split both ran under one `CODEX_HOME`,
 * which put the emulator's persona and decision protocol inside a directory the
 * agent (launched `agent-full-access`) is pointed at by its own env.
 */
Deno.test("emulator codex home is separate from the agent's and carries no user config", async () => {
  const realHome = Deno.env.get("HOME");
  const fakeHome = await Deno.makeTempDir({ prefix: "acp-emu-home-" });
  const workDir = await Deno.makeTempDir({ prefix: "acp-emu-work-" });
  const sandboxPath = join(workDir, "sandbox");
  await Deno.mkdir(sandboxPath, { recursive: true });
  // A user config that must NOT reach either home.
  await Deno.mkdir(join(fakeHome, ".codex", "skills", "leak"), {
    recursive: true,
  });
  await Deno.writeTextFile(
    join(fakeHome, ".codex", "config.toml"),
    'model_reasoning_effort = "xhigh"\n',
  );
  await Deno.writeTextFile(join(fakeHome, ".codex", "auth.json"), "{}\n");
  Deno.env.set("HOME", fakeHome);
  try {
    const agent = await prepareAcpCodexHome(sandboxPath);
    const emulator = await prepareEmulatorCodexHome();

    assert(
      emulator.CODEX_HOME !== agent.CODEX_HOME,
      "emulator must not share the agent's session store",
    );
    assert(
      !emulator.CODEX_HOME.startsWith(agent.HOME),
      `emulator home ${emulator.CODEX_HOME} sits inside the agent's ${agent.HOME}`,
    );
    assert(
      !agent.HOME.startsWith(emulator.HOME),
      "agent home must not sit inside the emulator's",
    );
    // Same isolation contract as the agent's root: credentials only.
    const entries: string[] = [];
    for await (const e of Deno.readDir(emulator.CODEX_HOME)) {
      entries.push(e.name);
    }
    assertEquals(entries.sort(), ["auth.json", "skills"]);
    assertEquals(
      await Deno.readTextFile(join(emulator.CODEX_HOME, "auth.json")),
      "{}\n",
    );
    await Deno.remove(emulator.HOME, { recursive: true });
  } finally {
    if (realHome) Deno.env.set("HOME", realHome);
    await Deno.remove(fakeHome, { recursive: true });
    await Deno.remove(workDir, { recursive: true });
  }
});
