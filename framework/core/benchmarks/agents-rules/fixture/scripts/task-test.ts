import { runNpm } from "./utils.ts";

await runNpm(["test", "--", ...Deno.args]);
