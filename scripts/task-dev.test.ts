import { assertEquals } from "./test-assert.ts";
import { buildDevCommands } from "./task-dev.ts";

Deno.test("buildDevCommands returns formatter and linter watch", () => {
  const commands = buildDevCommands();

  assertEquals(commands.length, 2, "Expected two dev commands.");
  assertEquals(commands[0].cmd, "deno");
  assertEquals(commands[0].args.join(" "), "fmt --watch scripts deno.json");
  assertEquals(commands[1].cmd, "deno");
  assertEquals(commands[1].args.join(" "), "lint --watch scripts");
});
