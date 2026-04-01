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
 * Result of a single buffered command execution.
 */
type BufferedResult = {
  command: CommandSpec;
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
};

/**
 * Runs multiple commands in parallel with buffered output.
 * - Prints progress lines as commands start/finish
 * - Buffers stdout/stderr per command (no interleaving)
 * - After all finish, prints output: passed first, then failed
 * - Throws Error listing all failed commands if any fail
 */
export async function runCommandsInParallelBuffered(
  commands: CommandSpec[],
): Promise<void> {
  const dim = ansi("\x1b[2m");
  const green = ansi("\x1b[32m");
  const red = ansi("\x1b[31m");
  const reset = ansi("\x1b[0m");

  const promises = commands.map(async (command): Promise<BufferedResult> => {
    const label = formatCommand(command);
    console.log(`${dim}[started]${reset} ${label}`);

    const proc = new Deno.Command(command.cmd, {
      args: command.args,
      cwd: command.cwd,
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    }).spawn();

    const collectStream = async (
      stream: ReadableStream<Uint8Array>,
    ): Promise<Uint8Array> => {
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const total = chunks.reduce((sum, c) => sum + c.length, 0);
      const result = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result;
    };

    const [status, stdoutBytes, stderrBytes] = await Promise.all([
      proc.status,
      collectStream(proc.stdout),
      collectStream(proc.stderr),
    ]);

    const decoder = new TextDecoder();
    const result: BufferedResult = {
      command,
      success: status.success,
      code: status.code ?? 1,
      stdout: decoder.decode(stdoutBytes),
      stderr: decoder.decode(stderrBytes),
    };

    if (result.success) {
      console.log(`${green}[done]${reset} ${label}`);
    } else {
      console.log(`${red}[failed]${reset} ${label}`);
    }

    return result;
  });

  const results = await Promise.allSettled(promises);
  const settled = results.map((r) => {
    if (r.status === "fulfilled") return r.value;
    throw r.reason;
  });

  // Print output: passed first, then failed
  const passed = settled.filter((r) => r.success);
  const failed = settled.filter((r) => !r.success);

  for (const r of [...passed, ...failed]) {
    const label = formatCommand(r.command);
    const statusTag = r.success ? `${green}PASS${reset}` : `${red}FAIL${reset}`;
    console.log(`\n=== ${statusTag} ${label} ===`);
    if (r.stdout) Deno.stdout.writeSync(new TextEncoder().encode(r.stdout));
    if (r.stderr) Deno.stderr.writeSync(new TextEncoder().encode(r.stderr));
  }

  if (failed.length > 0) {
    const summary = failed
      .map((r) => `  ${formatCommand(r.command)} (exit ${r.code})`)
      .join("\n");
    throw new Error(`${failed.length} command(s) failed:\n${summary}`);
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
