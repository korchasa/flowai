/**
 * Local ACP bridge store (FR-ACCEPT.BRIDGE-LOCAL).
 *
 * The claude and codex ACP bridges are npm packages. They used to be launched
 * with `npx -y <pkg>@<version>`, which looks free and is not: FR-ACCEPT-ISOLATION
 * hands every scenario a fresh bench-home as `HOME`, npm's cache lives under
 * `HOME`, so every scenario re-downloaded the whole tree before the agent said a
 * word — 7.9-10.8 s on codex, 9.3-13.2 s on claude, and 657 abandoned `.npm`
 * trees (154 GB) under `acceptance-tests/runs`.
 *
 * This module installs each pinned spec ONCE into `.acp-bridges/<pkg>@<ver>/`
 * at the repo root (gitignored) and hands `AcpAgent` the absolute path of the
 * installed launcher. Spawn-to-session-ready drops to 0.76-0.95 s (codex) and
 * 0.36-1.23 s (claude).
 *
 * There is deliberately NO npx fallback: a missing or mismatched store throws
 * naming the spec and the one command that fixes it. A silent slow path is
 * exactly how the original cost survived unnoticed.
 */
import { fromFileUrl, join } from "@std/path";

/** An ACP bridge shipped as an npm package. */
export interface NpmBridgeSpec {
  /** npm package name, scope included. */
  readonly package: string;
  /** Exact pinned version — never a range, never `latest`. */
  readonly version: string;
  /** Name of the executable npm links into `node_modules/.bin/`. */
  readonly bin: string;
}

/** How an IDE's ACP server is started: an npm bridge, or a native binary. */
export type AcpLaunch =
  | (
    & { readonly kind: "npm"; readonly env?: Readonly<Record<string, string>> }
    & NpmBridgeSpec
  )
  | {
    readonly kind: "binary";
    readonly command: string;
    readonly args: readonly string[];
    readonly env?: Readonly<Record<string, string>>;
  };

/** Directory name of the store, relative to the repo root. */
export const BRIDGE_STORE_DIRNAME = ".acp-bridges";

/** The command that populates the store — quoted in every failure message. */
export const BRIDGE_INSTALL_TASK = "deno task acp-bridges";

/** Absolute path of the store for this checkout. */
export function bridgeStoreRoot(): string {
  const repoRoot = fromFileUrl(new URL("../../../../", import.meta.url));
  return join(repoRoot, BRIDGE_STORE_DIRNAME);
}

/**
 * Store subdirectory for one pinned spec. The npm scope is flattened (a `/`
 * would nest the tree), and the version is part of the name so two pinned
 * versions coexist and a downgrade needs no cleanup.
 */
export function bridgeDirName(spec: NpmBridgeSpec): string {
  const flat = spec.package.replace(/^@/, "").replace(/\//g, "__");
  return `${flat}@${spec.version}`;
}

/** Absolute path of the launcher npm generates for the pinned spec. */
export function bridgeBinPath(root: string, spec: NpmBridgeSpec): string {
  return join(root, bridgeDirName(spec), "node_modules", ".bin", spec.bin);
}

/** True when the pinned version is present in the store. */
export function isBridgeInstalled(root: string, spec: NpmBridgeSpec): boolean {
  try {
    Deno.statSync(bridgeBinPath(root, spec));
    return true;
  } catch {
    return false;
  }
}

/**
 * Turn a launch spec into a spawnable `{ command, args }`.
 *
 * A native binary passes through. An npm bridge resolves to the absolute
 * launcher path, or throws — fail fast, no fallback (FR-ACCEPT.BRIDGE-LOCAL).
 */
export function resolveBridgeCommand(
  launch: AcpLaunch,
  root: string = bridgeStoreRoot(),
): { command: string; args: string[] } {
  if (launch.kind === "binary") {
    return { command: launch.command, args: [...launch.args] };
  }
  if (!isBridgeInstalled(root, launch)) {
    throw new Error(
      `ACP bridge ${launch.package}@${launch.version} is not installed in ${root}. ` +
        `Run \`${BRIDGE_INSTALL_TASK}\` to populate the bridge store.`,
    );
  }
  return { command: bridgeBinPath(root, launch), args: [] };
}

/** In-flight installs, so N parallel scenarios trigger at most one per spec. */
const inFlight = new Map<string, Promise<void>>();

/** Install the pinned spec into the store unless it is already there. */
export function ensureBridgeInstalled(
  root: string,
  spec: NpmBridgeSpec,
): Promise<void> {
  if (isBridgeInstalled(root, spec)) return Promise.resolve();
  const key = join(root, bridgeDirName(spec));
  const running = inFlight.get(key);
  if (running) return running;
  const started = installBridge(key, spec).finally(() => inFlight.delete(key));
  inFlight.set(key, started);
  return started;
}

async function installBridge(dir: string, spec: NpmBridgeSpec): Promise<void> {
  await Deno.mkdir(dir, { recursive: true });
  const cmd = new Deno.Command("npm", {
    args: [
      "install",
      "--no-save",
      "--no-audit",
      "--no-fund",
      "--loglevel",
      "error",
      "--prefix",
      dir,
      `${spec.package}@${spec.version}`,
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const out = await cmd.output();
  if (!out.success) {
    throw new Error(
      `npm install of ${spec.package}@${spec.version} failed (exit ${out.code}): ` +
        new TextDecoder().decode(out.stderr).trim(),
    );
  }
  if (!isBridgeInstalled(join(dir, ".."), spec)) {
    throw new Error(
      `npm install of ${spec.package}@${spec.version} left no ${spec.bin} launcher in ${dir}`,
    );
  }
}
