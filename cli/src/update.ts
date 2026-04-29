// [FR-DIST.UPDATE](../../documents/requirements.md#fr-dist.update-pre-flight-update-notice) — pre-flight notify-only check for `flowai` / `flowai sync`
// [FR-DIST.UPDATE-CMD](../../documents/requirements.md#fr-dist.update-cmd-self-update-subcommand) — standalone `flowai update` subcommand with auto-install
import {
  buildUpdateCommand,
  checkForUpdate,
  runUpdate,
  VERSION,
  type VersionCheckResult,
} from "./version.ts";

export interface SelfUpdateOptions {
  /** Non-interactive: print update command instead of prompting */
  yes?: boolean;
  /** Skip the update check entirely (--skip-update-check flag) */
  skip?: boolean;
  /** Injectable version string for testability (defaults to VERSION) */
  currentVersion?: string;
  /** Injectable checkForUpdate function for testability */
  checkFn?: (version: string) => Promise<VersionCheckResult | null>;
  /** Injectable runUpdate function for testability */
  installFn?: (version: string) => Promise<boolean>;
  /** Injectable prompt function for testability */
  promptFn?: (message: string) => Promise<boolean>;
  /** Injectable log function for testability */
  log?: (message: string) => void;
}

/**
 * Check JSR for a newer flowai version and optionally install it.
 * Returns true if an update was installed (caller should re-run flowai).
 * Shared by `flowai update` subcommand and `flowai sync` pre-flight check.
 */
export async function runSelfUpdate(
  options?: SelfUpdateOptions,
): Promise<boolean> {
  if (options?.skip) return false;

  const version = options?.currentVersion ?? VERSION;
  const checkFn = options?.checkFn ?? checkForUpdate;
  const installFn = options?.installFn ?? runUpdate;
  const log = options?.log ?? console.log;

  const update = await checkFn(version);

  if (!update) {
    log("Could not check for updates (network error or timeout).");
    return false;
  }

  if (!update.updateAvailable) {
    log(`Already up to date (${version}).`);
    return false;
  }

  log(`\nUpdate available: ${update.currentVersion} → ${update.latestVersion}`);

  if (options?.yes) {
    log(`Run: ${buildUpdateCommand(update.latestVersion)}\n`);
    return false;
  }

  const promptFn = options?.promptFn ?? defaultPrompt;
  const doUpdate = await promptFn("Update now?");
  if (!doUpdate) return false;

  const success = await installFn(update.latestVersion);
  if (success) {
    log(`\nUpdated to ${update.latestVersion}. Please re-run flowai.\n`);
    return true;
  }
  return false;
}

async function defaultPrompt(message: string): Promise<boolean> {
  const { Confirm } = await import("@cliffy/prompt");
  return Confirm.prompt({ message, default: true });
}

export interface NotifyUpdateOptions {
  /** Skip the update check entirely (--skip-update-check flag) */
  skip?: boolean;
  /** Injectable version string for testability (defaults to VERSION) */
  currentVersion?: string;
  /** Injectable checkForUpdate function for testability */
  checkFn?: (version: string) => Promise<VersionCheckResult | null>;
  /** Injectable log function for testability */
  log?: (message: string) => void;
}

/**
 * Check JSR for a newer flowai version and print a notification only.
 * Never installs — users must run `flowai update` to apply.
 * Silent when up to date, network-failing, or skipped. Fail-open.
 */
export async function notifyUpdateAvailable(
  options?: NotifyUpdateOptions,
): Promise<void> {
  if (options?.skip) return;

  const version = options?.currentVersion ?? VERSION;
  const checkFn = options?.checkFn ?? checkForUpdate;
  const log = options?.log ?? console.log;

  const update = await checkFn(version);
  if (!update || !update.updateAvailable) return;

  log(
    `\nUpdate available: ${update.currentVersion} → ${update.latestVersion}. Run \`flowai update\` to install.\n`,
  );
}
