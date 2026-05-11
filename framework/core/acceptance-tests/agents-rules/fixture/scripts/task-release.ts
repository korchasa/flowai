import { runCommand } from "./utils.ts";

console.log("--- CREATING RELEASE ---");
await runCommand("deno", ["task", "release"]);
await runCommand("git", ["push", "--follow-tags", "origin", "main"]);
