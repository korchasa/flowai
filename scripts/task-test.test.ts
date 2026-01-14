import { assertEquals } from "./test-assert.ts";
import { buildTestCommand } from "./task-test.ts";

Deno.test("buildTestCommand defaults to scripts", () => {
  const command = buildTestCommand([]);

  assertEquals(command.cmd, "deno");
  assertEquals(command.args.join(" "), "test scripts");
});

Deno.test("buildTestCommand forwards args", () => {
  const command = buildTestCommand(["--filter", "task"]);

  assertEquals(command.cmd, "deno");
  assertEquals(command.args.join(" "), "test --filter task");
});
