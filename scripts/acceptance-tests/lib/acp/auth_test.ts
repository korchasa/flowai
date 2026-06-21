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
import { prepareAcpClaudeHome } from "./auth.ts";

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
