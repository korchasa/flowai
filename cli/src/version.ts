import { greaterThan, parse } from "@std/semver";
import { VERSION } from "./_version.ts";

export { VERSION };

const JSR_META_URL = "https://jsr.io/@korchasa/flow-cli/meta.json";
const DEFAULT_TIMEOUT_MS = 5000;
const UPDATE_COMMAND = "deno install -g -A -f jsr:@korchasa/flow-cli";

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
 * Check JSR for a newer version of flow-cli.
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
        updateCommand: UPDATE_COMMAND,
      };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}
