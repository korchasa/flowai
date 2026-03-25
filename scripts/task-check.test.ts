import { assertEquals } from "@std/assert";
import { buildCheckCommands } from "./task-check.ts";

Deno.test("buildCheckCommands returns expected steps", () => {
  const commands = buildCheckCommands();

  assertEquals(commands.length, 10, "Expected ten check commands.");
  assertEquals(commands[0].args.join(" "), "task bundle");
  assertEquals(
    commands[1].args.join(" "),
    "fmt --check scripts cli/src cli/scripts deno.json",
  );
  assertEquals(commands[2].args.join(" "), "lint scripts cli/src cli/scripts");
  assertEquals(
    commands[3].args.join(" "),
    "test -A --ignore=scripts/benchmarks/lib/integration.test.ts scripts",
  );
  assertEquals(commands[4].args.join(" "), "test -A cli/src");
  assertEquals(commands[5].args.join(" "), "check cli/src/main.ts");
  assertEquals(commands[6].args.join(" "), "run -A scripts/check-skills.ts");
  assertEquals(commands[7].args.join(" "), "run -A scripts/check-agents.ts");
  assertEquals(
    commands[8].args.join(" "),
    "run -A scripts/check-skill-sync.ts",
  );
  assertEquals(
    commands[9].args.join(" "),
    "run -A scripts/check-pack-refs.ts",
  );
});
