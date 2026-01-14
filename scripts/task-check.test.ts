import { assertEquals } from "./test-assert.ts";
import { buildCheckCommands } from "./task-check.ts";

Deno.test("buildCheckCommands returns expected steps", () => {
  const commands = buildCheckCommands();

  assertEquals(commands.length, 3, "Expected three check commands.");
  assertEquals(commands[0].cmd, "deno");
  assertEquals(commands[0].args.join(" "), "fmt --check scripts deno.json");
  assertEquals(commands[1].cmd, "deno");
  assertEquals(commands[1].args.join(" "), "lint scripts");
  assertEquals(commands[2].cmd, "deno");
  assertEquals(commands[2].args.join(" "), "test scripts");
});
