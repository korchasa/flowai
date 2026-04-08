import { runNpm } from "./utils.ts";

console.log("--- LINTING ---");
await runNpm(["run", "lint"]);
console.log("--- TESTING ---");
await runNpm(["test"]);
console.log("--- BUILDING ---");
await runNpm(["run", "build"]);
console.log("--- CHECK COMPLETED ---");
