import { assertEquals } from "@std/assert";
import { buildCheckCommands } from "./task-check.ts";

Deno.test("buildCheckCommands returns expected steps", () => {
  const commands = buildCheckCommands();

  assertEquals(commands.length, 7, "Expected seven check commands.");
  assertEquals(commands[0].cmd, "deno");
  assertEquals(commands[0].args.join(" "), "run -A scripts/task-link.ts");
  assertEquals(commands[1].cmd, "deno");
  assertEquals(commands[1].args.join(" "), "fmt --check scripts deno.json");
  assertEquals(commands[2].cmd, "deno");
  assertEquals(commands[2].args.join(" "), "lint scripts");
  assertEquals(commands[3].cmd, "deno");
  assertEquals(
    commands[3].args.join(" "),
    "test -A --ignore=scripts/benchmarks/lib/integration.test.ts scripts",
  );
  assertEquals(commands[4].cmd, "deno");
  assertEquals(commands[4].args.join(" "), "run -A scripts/check-skills.ts");
  assertEquals(commands[5].cmd, "deno");
  assertEquals(commands[5].args.join(" "), "run -A scripts/check-agents.ts");
  assertEquals(commands[6].cmd, "deno");
  assertEquals(
    commands[6].args.join(" "),
    "run -A scripts/check-skill-sync.ts",
  );
});
