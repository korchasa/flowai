import { assertEquals } from "@std/assert";
import { buildCheckCommands } from "./task-check.ts";

Deno.test("buildCheckCommands returns expected steps", () => {
  const commands = buildCheckCommands();

  assertEquals(commands.length, 12, "Expected twelve check commands.");
  assertEquals(commands[0].args.join(" "), "task bundle");
  assertEquals(
    commands[1].args.join(" "),
    "fmt --check scripts cli/src cli/scripts framework deno.json",
  );
  assertEquals(commands[2].args.join(" "), "lint scripts cli/src cli/scripts");
  assertEquals(
    commands[3].args.join(" "),
    "lint --rules-exclude=no-import-prefix,no-unversioned-import framework",
  );
  assertEquals(
    commands[4].args.join(" "),
    "test -A --ignore=scripts/benchmarks/lib/integration.test.ts scripts",
  );
  assertEquals(commands[5].args.join(" "), "test -A cli/src");
  assertEquals(
    commands[6].args.join(" "),
    "test -A --ignore=framework/*/skills/*/benchmarks framework",
  );
  assertEquals(commands[7].args.join(" "), "check cli/src/main.ts");
  assertEquals(commands[8].args.join(" "), "run -A scripts/check-skills.ts");
  assertEquals(commands[9].args.join(" "), "run -A scripts/check-agents.ts");
  assertEquals(
    commands[10].args.join(" "),
    "run -A scripts/check-skill-sync.ts",
  );
  assertEquals(
    commands[11].args.join(" "),
    "run -A scripts/check-pack-refs.ts",
  );
});
