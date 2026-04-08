export async function runCommand(
  command: string,
  args: string[] = [],
): Promise<void> {
  const process = new Deno.Command(command, {
    args,
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await process.output();
  if (code !== 0) {
    Deno.exit(code);
  }
}

export async function runNpm(args: string[]): Promise<void> {
  await runCommand("npm", args);
}
