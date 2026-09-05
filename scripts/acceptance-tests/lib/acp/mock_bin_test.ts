import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { writeLoginShellPathPrepend, writeMockBin } from "./mock_bin.ts";

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

Deno.test("writeLoginShellPathPrepend keeps the stub ahead of /usr/bin in every login shell present", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mockbin-" });
  try {
    const binDir = await writeMockBin(join(dir, "bin"), {
      curl: "BENCHMOCK-CURL",
    });
    assert(binDir, "binDir returned");
    const home = join(dir, "home");
    await Deno.mkdir(home);
    await writeLoginShellPathPrepend(home, binDir);
    // macOS `/etc/zprofile` runs `path_helper`, which moves the system
    // directories in front of everything the parent put on PATH — the stub
    // must still win after that reordering. The function writes a profile
    // for zsh AND bash; exercise whichever of the two the host has (Linux
    // CI runners ship no `/bin/zsh`), and fail loudly when it has neither.
    const shells: string[] = [];
    for (const shell of ["/bin/zsh", "/bin/bash"]) {
      try {
        await Deno.stat(shell);
        shells.push(shell);
      } catch (e) {
        if (!(e instanceof Deno.errors.NotFound)) throw e;
      }
    }
    assert(shells.length > 0, "neither /bin/zsh nor /bin/bash is installed");
    for (const shell of shells) {
      const out = await new Deno.Command(shell, {
        args: ["-lc", "which curl; curl"],
        env: { HOME: home, PATH: `${binDir}:/usr/bin:/bin` },
        stdout: "piped",
        stderr: "null",
      }).output();
      const stdout = new TextDecoder().decode(out.stdout);
      assertStringIncludes(stdout, join(binDir, "curl"), shell);
      assertStringIncludes(stdout, "BENCHMOCK-CURL", shell);
    }
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
