import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { createAdapter } from "./mod.ts";

Deno.test("the claude adapter reads agent usage from the run's HOME transcripts", async () => {
  const home = await Deno.makeTempDir();
  try {
    const slug = join(home, ".claude", "projects", "-tmp-sandbox");
    await Deno.mkdir(slug, { recursive: true });
    await Deno.writeTextFile(
      join(slug, "sess.jsonl"),
      JSON.stringify({
        type: "assistant",
        message: {
          id: "msg_1",
          usage: {
            input_tokens: 3,
            cache_read_input_tokens: 40,
            cache_creation_input_tokens: 5,
            output_tokens: 7,
          },
        },
      }),
    );
    const usage = await createAdapter("claude").calculateUsage({ HOME: home });
    assertEquals(usage?.total, 55);
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});

Deno.test("the claude adapter reports null, not zero, without a HOME", async () => {
  assertEquals(await createAdapter("claude").calculateUsage({}), null);
});
