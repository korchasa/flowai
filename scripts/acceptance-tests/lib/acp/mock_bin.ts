/**
 * Tool mocking over ACP via PATH-shadowing (FR-ACCEPT.ACP).
 *
 * The direct path mocked a shell tool by intercepting `PreToolUse` and feeding
 * the canned `reason` back to the model AS the tool's output. ACP's
 * `session/request_permission` cannot carry that output (its response is only an
 * option id), so a permission-deny would make the model see "denied" instead of
 * the canned result — a behavioural regression.
 *
 * Instead we shadow the mocked command on the agent's `PATH`: a stub executable
 * per tool prints the canned `reason` and exits, so when the agent actually runs
 * `curl …` it receives exactly the mock text — identical to the direct path,
 * IDE-agnostic, and with no special agent cooperation. One stub = one static
 * response (mirrors the static one-response-per-tool contract).
 */
import { join } from "@std/path";

/**
 * Writes one stub executable per mocked tool into `binDir` (created if absent)
 * and returns `binDir` for prepending to the agent's `PATH`. Each stub prints
 * the canned reason to stdout and stderr and exits 0 — the reason text is the
 * signal the model reads (e.g. `bash: curl: command not found`). Returns null
 * when there are no mocks.
 */
export async function writeMockBin(
  binDir: string,
  mocks: Record<string, string>,
): Promise<string | null> {
  const tools = Object.keys(mocks);
  if (tools.length === 0) return null;

  await Deno.mkdir(binDir, { recursive: true });
  for (const tool of tools) {
    // Single-quote-safe: close the quote, emit an escaped quote, reopen.
    const reason = mocks[tool].replaceAll("'", `'\\''`);
    const script = `#!/bin/sh
# ACP mock stub for \`${tool}\` (FR-ACCEPT.ACP). Emits the canned reason as the
# tool's output so the model sees the mock result, then exits.
printf '%s\\n' '${reason}'
printf '%s\\n' '${reason}' 1>&2
exit 0
`;
    const path = join(binDir, tool);
    await Deno.writeTextFile(path, script);
    await Deno.chmod(path, 0o755);
  }
  return binDir;
}

/**
 * Keeps `binDir` at the head of `PATH` inside the login shells the agent
 * spawns. Prepending `binDir` to the launch `PATH` is not enough on macOS:
 * codex runs every command as `zsh -lc`, the system `/etc/zprofile` invokes
 * `path_helper`, and that rewrites `PATH` with the system directories first —
 * `/usr/bin/curl` then shadows the stub, and the mock silently never fires
 * (observed on the 2026-09-02 sweep: both `select-llm-model` scenarios fetched
 * live data past a mocked `curl`). `~/.zprofile` is sourced AFTER the system
 * file, so a prepend there is the last word. The bench `HOME` is isolated,
 * so the file never touches the operator's own profile. `~/.bash_profile`
 * gets the same line for a bash-shelled host.
 */
export async function writeLoginShellPathPrepend(
  home: string,
  binDir: string,
): Promise<void> {
  const line = `export PATH="${binDir}:$PATH"\n`;
  for (const name of [".zprofile", ".bash_profile"]) {
    await Deno.writeTextFile(join(home, name), line, { append: true });
  }
}
