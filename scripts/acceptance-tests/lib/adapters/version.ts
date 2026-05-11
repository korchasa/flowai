/**
 * Best-effort CLI `--version` probe used by the benchmark cache-key.
 *
 * Contract:
 *   - Returns the trimmed stdout on success.
 *   - Returns "" on any failure (missing binary, non-zero exit, timeout).
 *   - Never throws. The empty string is a stable value — callers may treat it
 *     as "could not probe on this host" and the cache key stays consistent
 *     across repeated probes while the binary is absent. Installing the CLI
 *     later invalidates the key (correct behavior).
 */

export async function probeCliVersion(
  command: string,
  timeoutMs = 2000,
): Promise<string> {
  try {
    const cmd = new Deno.Command(command, {
      args: ["--version"],
      stdout: "piped",
      stderr: "piped",
    });
    const child = cmd.spawn();
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch (_) {
        // already exited
      }
    }, timeoutMs);
    try {
      const output = await child.output();
      if (!output.success) return "";
      return new TextDecoder().decode(output.stdout).trim();
    } finally {
      clearTimeout(timer);
    }
  } catch (_) {
    return "";
  }
}
