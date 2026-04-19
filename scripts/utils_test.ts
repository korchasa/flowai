import { assertEquals, assertRejects } from "@std/assert";
import { runCommandsInParallelBuffered } from "./utils.ts";

Deno.test("runCommandsInParallelBuffered: all commands succeed", async () => {
  let resolved = false;
  await runCommandsInParallelBuffered([
    { cmd: "deno", args: ["eval", "console.log('hello')"] },
    { cmd: "deno", args: ["eval", "console.log('world')"] },
  ]).then(() => {
    resolved = true;
  });
  assertEquals(resolved, true);
});

Deno.test("runCommandsInParallelBuffered: one command fails — error lists failed", async () => {
  const error = await assertRejects(
    () =>
      runCommandsInParallelBuffered([
        { cmd: "deno", args: ["eval", "console.log('ok')"] },
        { cmd: "deno", args: ["eval", "Deno.exit(42)"] },
      ]),
    Error,
  );
  assertEquals(error.message.includes("1 command(s) failed"), true);
  assertEquals(error.message.includes("exit 42"), true);
});

Deno.test("runCommandsInParallelBuffered: multiple failures reported", async () => {
  const error = await assertRejects(
    () =>
      runCommandsInParallelBuffered([
        { cmd: "deno", args: ["eval", "Deno.exit(1)"] },
        { cmd: "deno", args: ["eval", "Deno.exit(2)"] },
      ]),
    Error,
  );
  assertEquals(error.message.includes("2 command(s) failed"), true);
});

Deno.test("runCommandsInParallelBuffered: empty commands list succeeds", async () => {
  let resolved = false;
  await runCommandsInParallelBuffered([]).then(() => {
    resolved = true;
  });
  assertEquals(resolved, true);
});
