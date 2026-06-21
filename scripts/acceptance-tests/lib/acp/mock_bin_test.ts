import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { writeMockBin } from "./mock_bin.ts";

Deno.test("writeMockBin returns null when there are no mocks", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mockbin-" });
  try {
    assertEquals(await writeMockBin(join(dir, "bin"), {}), null);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test({
  name: "writeMockBin stub shadows the tool and emits the canned reason",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const dir = await Deno.makeTempDir({ prefix: "mockbin-" });
    try {
      const binDir = await writeMockBin(join(dir, "bin"), {
        curl: "bash: curl: command not found",
      });
      assert(binDir, "binDir returned");

      // Running the tool via a PATH that prepends binDir must resolve to the
      // stub and emit the canned reason — exactly what the model would read.
      const out = await new Deno.Command("/bin/sh", {
        args: ["-c", "curl https://example.com"],
        env: { PATH: `${binDir}:${Deno.env.get("PATH") ?? ""}` },
        stdout: "piped",
        stderr: "piped",
      }).output();
      const stdout = new TextDecoder().decode(out.stdout);
      assertStringIncludes(stdout, "bash: curl: command not found");
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  },
});

Deno.test("writeMockBin escapes single quotes in the reason", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mockbin-" });
  try {
    const binDir = await writeMockBin(join(dir, "bin"), {
      wget: "can't reach 'host'",
    });
    const out = await new Deno.Command("/bin/sh", {
      args: ["-c", "wget x"],
      env: { PATH: `${binDir}:${Deno.env.get("PATH") ?? ""}` },
      stdout: "piped",
      stderr: "null",
    }).output();
    assertStringIncludes(
      new TextDecoder().decode(out.stdout),
      "can't reach 'host'",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
