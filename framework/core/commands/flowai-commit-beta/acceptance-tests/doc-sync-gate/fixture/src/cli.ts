export function main(argv: string[]): void {
  const verbose = argv.includes("--verbose");
  const cmd = argv.find((a) => !a.startsWith("--"));
  if (cmd === "run") {
    if (verbose) console.log("[verbose] starting run");
    console.log("run: ok");
    if (verbose) console.log("[verbose] done");
    return;
  }
  console.error(`unknown command: ${cmd}`);
}
