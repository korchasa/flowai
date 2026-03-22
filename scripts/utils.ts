import { dirname } from "@std/path";

/**
 * Returns the ANSI code if colors are enabled, empty string otherwise.
 * Disables colors when NO_COLOR is set (via Deno.noColor) or when running
 * inside Claude Code (CLAUDECODE=1).
 */
export function ansi(code: string): string {
  if (Deno.noColor) return "";
  if (Deno.env.get("CLAUDECODE") === "1") return "";
  return code;
}

/**
 * Specification for a command to be executed.
 */
export type CommandSpec = {
  cmd: string;
  args: string[];
  cwd?: string;
};

/**
 * Formats a command for display or logging.
 */
function formatCommand({ cmd, args }: CommandSpec): string {
  if (args.length === 0) {
    return cmd;
  }
  return `${cmd} ${args.join(" ")}`;
}

/**
 * Runs a single command and waits for it to complete.
 * @throws Error if the command fails.
 */
export async function runCommand(command: CommandSpec): Promise<void> {
  const process = new Deno.Command(command.cmd, {
    args: command.args,
    cwd: command.cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();

  const status = await process.status;
  if (!status.success) {
    const code = status.code ?? 1;
    throw new Error(`Command failed (${code}): ${formatCommand(command)}`);
  }
}

/**
 * Runs multiple commands sequentially.
 */
export async function runCommands(commands: CommandSpec[]): Promise<void> {
  for (const command of commands) {
    await runCommand(command);
  }
}

/**
 * Runs multiple commands in parallel.
 * @throws Error if any command fails.
 */
export async function runCommandsInParallel(
  commands: CommandSpec[],
): Promise<void> {
  const processes = commands.map((command) =>
    new Deno.Command(command.cmd, {
      args: command.args,
      cwd: command.cwd,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }).spawn()
  );

  const results = await Promise.all(processes.map((process) => process.status));
  const failed = results.find((status) => !status.success);
  if (failed) {
    const code = failed.code ?? 1;
    throw new Error(`Command failed (${code}).`);
  }
}

/**
 * Moves a file and cleans up empty parent directories.
 */
export async function moveFileWithCleanup(
  src: string,
  dest: string,
): Promise<void> {
  // Ensure destination directory exists
  await Deno.mkdir(dirname(dest), { recursive: true });

  // Move the file
  await runCommand({ cmd: "mv", args: [src, dest] });

  // Cleanup empty directories
  let currentDir = dirname(src);
  const rootDir = Deno.cwd();

  while (currentDir !== rootDir && currentDir !== "/" && currentDir !== ".") {
    try {
      const entries = [];
      for await (const entry of Deno.readDir(currentDir)) {
        entries.push(entry);
      }

      if (entries.length === 0) {
        await Deno.remove(currentDir);
        currentDir = dirname(currentDir);
      } else {
        break;
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        break;
      }
      throw error;
    }
  }
}
