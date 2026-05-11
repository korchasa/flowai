/**
 * task-bench CLI plumbing: help text, argv parser, per-process file lock.
 * Extracted from `scripts/task-bench.ts` so the entry point stays small.
 */
import { join } from "@std/path";
import { type Args, parse } from "@std/flags";
import { existsSync } from "@std/fs";
import { ansi } from "../../utils.ts";
import { SUPPORTED_IDES } from "./adapters/mod.ts";

/** Prints CLI usage information with available options. */
export function printHelp(defaultAgentModel: string): void {
  console.log(`
Usage: deno task bench [options]

Options:
  -f, --filter <string>        Filter scenarios by ID (substring match)
  -m, --model <string>         Agent model to use (default: ${defaultAgentModel})
  -i, --ide <string>           IDE adapter to use (${
    SUPPORTED_IDES.join(", ")
  }) (default: from config)
  -n, --runs <number>          Number of runs per scenario (default: 1)
  -s, --skill-override <name>  Override skill name in filtered scenarios (A/B testing)
  -p, --parallel <number>      Max concurrent scenarios (default: 1, sequential)
  --lock <string>              Custom lock file name (default: benchmarks.lock)
  --no-cache                   Bypass the committed result cache (no read, no write)
  --refresh-cache              Always run; overwrite cache on success
  --cache-check                Exit non-zero on any cache miss (CI gate)
  --cache-with-runs            Opt-in to caching when -n > 1 (default: bypass)
  --help                       Show this help message
  `);
}

/** Parses CLI args and applies cache-flag validation rules. Exits on
 * validation errors, --help, or unexpected positional args. */
export function parseAndValidateArgs(): Args {
  const args = parse(Deno.args, {
    string: [
      "filter",
      "runs",
      "model",
      "ide",
      "parallel",
      "lock",
      "skill-override",
    ],
    boolean: [
      "help",
      "no-cache",
      "refresh-cache",
      "cache-check",
      "cache-with-runs",
    ],
    alias: {
      f: "filter",
      n: "runs",
      s: "skill-override",
      h: "help",
      m: "model",
      i: "ide",
      p: "parallel",
    },
    unknown: (arg) => {
      if (arg.startsWith("-")) {
        console.error(`Unknown argument: ${arg}`);
        printHelp("<per IDE>");
        Deno.exit(1);
      }
      return true;
    },
  });

  // Cache-mode flags are mutually exclusive: picking two contradicts intent.
  const modeFlags = [
    ["--no-cache", args["no-cache"]] as const,
    ["--refresh-cache", args["refresh-cache"]] as const,
    ["--cache-check", args["cache-check"]] as const,
  ].filter(([, on]) => !!on).map(([n]) => n);
  if (modeFlags.length > 1) {
    console.error(`Mutually exclusive cache flags: ${modeFlags.join(", ")}`);
    Deno.exit(1);
  }
  const runsCount = parseInt(args.runs || "1", 10);
  if (args["cache-check"] && runsCount > 1 && !args["cache-with-runs"]) {
    console.error(
      `--cache-check with -n > 1 requires --cache-with-runs (otherwise the cache is bypassed and every scenario is a miss).`,
    );
    Deno.exit(1);
  }

  if (args.help) {
    printHelp("<per IDE>");
    Deno.exit(0);
  }

  if (args._.length > 0) {
    console.error(`Unexpected positional arguments: ${args._.join(", ")}`);
    printHelp("<per IDE>");
    Deno.exit(1);
  }

  return args;
}

/** Check whether a process with the given PID exists. Sends SIGCONT — a no-op
 * for running processes (resumes if stopped, otherwise nothing) — and treats
 * Deno.kill throwing as "process gone or unreachable". Returns true if the
 * PID is alive; false on ESRCH (gone), invalid input, or any other failure
 * (defensive: treat unknown as stale rather than block forever). */
function isProcessAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    Deno.kill(pid, "SIGCONT");
    return true;
  } catch {
    return false;
  }
}

/** Acquire the per-process benchmark lock. Exits 1 if another bench is genuinely
 * running. Self-heals stale locks left by crashed prior runs (PID recorded but
 * process no longer exists). Sets up `unload`/SIGINT/SIGTERM handlers to remove
 * the lock on shutdown. */
export async function acquireBenchmarkLock(lockFile: string): Promise<void> {
  if (existsSync(lockFile)) {
    const pidStr = await Deno.readTextFile(lockFile).catch(() => "");
    const pid = parseInt(pidStr.trim(), 10);
    if (Number.isFinite(pid) && isProcessAlive(pid)) {
      console.error(
        `${
          ansi("\x1b[31m")
        }Error: Another benchmark process (PID: ${pid}) is already running.${
          ansi("\x1b[0m")
        }`,
      );
      Deno.exit(1);
    }
    console.warn(
      `${ansi("\x1b[33m")}Removing stale benchmark lock (recorded PID ${
        pidStr.trim() || "unknown"
      } not running).${ansi("\x1b[0m")}`,
    );
    try {
      Deno.removeSync(lockFile);
    } catch {
      // Ignore — proceed to overwrite below
    }
  }

  await Deno.mkdir(join(Deno.cwd(), "benchmarks"), { recursive: true });
  await Deno.writeTextFile(lockFile, Deno.pid.toString());

  const cleanup = () => {
    try {
      Deno.removeSync(lockFile);
    } catch {
      // Ignore if already removed
    }
  };

  globalThis.addEventListener("unload", cleanup);
  Deno.addSignalListener("SIGINT", () => {
    cleanup();
    Deno.exit(130);
  });
  Deno.addSignalListener("SIGTERM", () => {
    cleanup();
    Deno.exit(143);
  });
}
