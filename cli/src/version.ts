// [FR-DIST.UPDATE](../../documents/requirements.md#fr-dist.update-pre-flight-update-notice) — self-update check against JSR
import { greaterThan, parse } from "@std/semver";
import { VERSION } from "./_version.ts";

export { VERSION };

const JSR_META_URL = "https://jsr.io/@korchasa/flowai/meta.json";
const DEFAULT_TIMEOUT_MS = 5000;
const UPDATE_COMMAND_PREFIX = "deno install -g -A -f";
const JSR_PACKAGE = "jsr:@korchasa/flowai";

/** Build update command with explicit version to bypass deno.lock pinning */
export function buildUpdateCommand(version: string): string {
  return `${UPDATE_COMMAND_PREFIX} ${JSR_PACKAGE}@${version}`;
}

/** Result of a version check against JSR registry */
export interface VersionCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  updateCommand: string;
}

export interface CheckForUpdateOptions {
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

/**
 * Check JSR for a newer version of flowai.
 * Returns null on any error (network, parse, timeout) — fail-open design.
 */
export async function checkForUpdate(
  currentVersion: string,
  options?: CheckForUpdateOptions,
): Promise<VersionCheckResult | null> {
  const fetchFn = options?.fetch ?? globalThis.fetch;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchFn(JSR_META_URL, {
        signal: controller.signal,
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const latestVersion = data?.latest;

      if (typeof latestVersion !== "string") {
        return null;
      }

      const current = parse(currentVersion);
      const latest = parse(latestVersion);
      const updateAvailable = greaterThan(latest, current);

      return {
        currentVersion,
        latestVersion,
        updateAvailable,
        updateCommand: buildUpdateCommand(latestVersion),
      };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

export interface RunUpdateOptions {
  /** Override for spawning subprocess (for testing) */
  spawn?: (
    cmd: string[],
  ) => Promise<{ success: boolean; stderr: string }>;
}

/**
 * Run the update command with explicit version pinning.
 * Explicit version in the specifier (e.g. jsr:@korchasa/flowai@0.3.2) bypasses
 * the stale deno.lock in ~/.deno/bin/.flowai/ that pins the old resolved version.
 */
export async function runUpdate(
  version: string,
  options?: RunUpdateOptions,
): Promise<boolean> {
  const parts = buildUpdateCommand(version).split(" ");
  const spawnFn = options?.spawn ?? defaultSpawn;

  const result = await spawnFn(parts);
  if (!result.success) {
    console.error(`Update failed: ${result.stderr}`);
    return false;
  }
  return true;
}

async function defaultSpawn(
  cmd: string[],
): Promise<{ success: boolean; stderr: string }> {
  const proc = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "inherit",
    stderr: "piped",
  });
  const output = await proc.output();
  return {
    success: output.success,
    stderr: new TextDecoder().decode(output.stderr),
  };
}
