import { assertEquals } from "@std/assert";
import { createAdapter } from "./adapters/mod.ts";
import { initSandboxGit } from "./runner.ts";
import type { BenchmarkScenario, SandboxContext } from "./types.ts";

// setup() must learn where the framework went: `.claude/` on the claude arm,
// `.codex/` on codex. A scenario that guesses one arm's dir aborts or tests the
// wrong file on the other (update-basic, adapt-agents-basic, 2026-10-18).
for (const ide of ["claude", "codex"]) {
  Deno.test(`initSandboxGit: setup() receives the ${ide} arm's IDE and configDir`, async () => {
    const adapter = createAdapter(ide);
    const sandbox = await Deno.makeTempDir({ prefix: "setup-ctx-" });
    const seen: SandboxContext[] = [];
    const scenario = {
      setup: (_path: string, ctx: SandboxContext) => {
        seen.push(ctx);
        return Promise.resolve();
      },
    } as unknown as BenchmarkScenario;
    try {
      await initSandboxGit(sandbox, scenario, adapter);
      assertEquals(seen, [{ ide, configDir: `.${ide}` }]);
    } finally {
      await Deno.remove(sandbox, { recursive: true });
    }
  });
}
