import { assertEquals } from "@std/assert";
import { buildTestCommand } from "./task-test.ts";

Deno.test("buildTestCommand defaults to scripts", () => {
  const command = buildTestCommand([]);

  assertEquals(command.cmd, "deno");
  assertEquals(
    command.args.join(" "),
    "test -A --coverage=./tmp/coverage scripts",
  );
});

Deno.test("buildTestCommand forwards args", () => {
  const command = buildTestCommand(["--filter", "task"]);

  assertEquals(command.cmd, "deno");
  assertEquals(
    command.args.join(" "),
    "test -A --coverage=./tmp/coverage --filter task",
  );
});
