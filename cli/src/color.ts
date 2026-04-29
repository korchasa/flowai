// [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — ANSI color helpers for renderSyncOutput
/** Minimal ANSI color helpers. Respect NO_COLOR (https://no-color.org/) and
 * `Deno.stdout.isTerminal()` when auto-detecting; callers may also force on/off
 * via an explicit flag. */

const ANSI_RED = "\x1b[31m";
const ANSI_RESET = "\x1b[0m";

/** Auto-detect whether ANSI colors should be emitted.
 * Disables when `NO_COLOR` env is set (any value, per the standard) or when
 * stdout is not a TTY. */
export function detectColor(): boolean {
  if (Deno.env.get("NO_COLOR") !== undefined) return false;
  const stdout = Deno.stdout as { isTerminal?: () => boolean };
  if (typeof stdout.isTerminal === "function" && !stdout.isTerminal()) {
    return false;
  }
  return true;
}

/** Wrap text in ANSI red + reset when `color` is true; identity otherwise. */
export function red(text: string, color: boolean): string {
  return color ? `${ANSI_RED}${text}${ANSI_RESET}` : text;
}
