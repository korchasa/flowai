export type CommandSpec = {
  cmd: string;
  args: string[];
};

function formatCommand({ cmd, args }: CommandSpec): string {
  if (args.length === 0) {
    return cmd;
  }
  return `${cmd} ${args.join(" ")}`;
}

export async function runCommand(command: CommandSpec): Promise<void> {
  const process = new Deno.Command(command.cmd, {
    args: command.args,
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

export async function runCommands(commands: CommandSpec[]): Promise<void> {
  for (const command of commands) {
    await runCommand(command);
  }
}

export async function runCommandsInParallel(
  commands: CommandSpec[],
): Promise<void> {
  const processes = commands.map((command) =>
    new Deno.Command(command.cmd, {
      args: command.args,
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
