import { assertEquals } from "@std/assert";
import { buildTestCommand } from "./task-test.ts";

Deno.test("buildTestCommand defaults to scripts minus the live-agent test and the bench checkouts", () => {
  const command = buildTestCommand([]);

  assertEquals(command.cmd, "deno");
  assertEquals(
    command.args.join(" "),
    "test -A --coverage=./tmp/coverage --ignore=scripts/acceptance-tests/lib/runner_test.ts,scripts/benchmark/runs scripts",
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
