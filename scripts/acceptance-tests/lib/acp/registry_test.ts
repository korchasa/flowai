/**
 * ACP registry invariants (FR-ACCEPT.ACP, FR-BENCH-SWE.IDE).
 *
 * The registry is data, so these tests encode the RULES that data must satisfy
 * — not its literal contents. Two rules, both learned from real breakage:
 *
 * 1. A spec that reaches its agent through an npm bridge MUST pin an exact
 *    version. The pinned version is folded into the acceptance-test cache key
 *    (FR-ACCEPT-CACHE); a floating `@latest` would silently serve stale verdicts
 *    after an upstream release.
 * 2. A spec must not invoke a subcommand its CLI does not have. `codex acp` was
 *    such a row: codex-cli 0.144.6 has no `acp` subcommand, so the launch fell
 *    through to the interactive TUI treating "acp" as a prompt, and the codex
 *    transport could never have worked. Codex reaches ACP only through the
 *    external `@agentclientprotocol/codex-acp` bridge.
 */
import { assert, assertEquals, assertMatch } from "@std/assert";
import { ACP_AGENTS, ACP_LIB_VERSION, type AcpAgentSpec } from "./registry.ts";

const specs = Object.values(ACP_AGENTS) as AcpAgentSpec[];

Deno.test("every npm-bridged ACP spec pins an exact version", () => {
  for (const spec of specs) {
    if (spec.launch.command !== "npx") continue;
    const pkg = spec.launch.args.find((a) => a.startsWith("@"));
    assert(pkg, `${spec.ide}: npx launch names no package`);
    assertMatch(
      pkg,
      /@\d+\.\d+\.\d+$/,
      `${spec.ide}: bridge "${pkg}" must pin an exact version so the ` +
        `acceptance-test cache key invalidates on upgrade`,
    );
  }
});

Deno.test("codex reaches ACP through the bridge, never a codex subcommand", () => {
  const codex = ACP_AGENTS.codex;
  assert(
    codex.launch.command !== "codex",
    "codex-cli has no `acp` subcommand (verified on 0.144.6): launching the " +
      "codex binary directly starts the interactive TUI with the args as a prompt",
  );
  assert(
    codex.launch.args.some((a) => a.includes("codex-acp")),
    "codex must launch the @agentclientprotocol/codex-acp bridge",
  );
});

Deno.test("codex authenticates by subscription, like claude", () => {
  // Both IDEs run under the maintainer's plan login (~/.codex/auth.json holds
  // a ChatGPT access_token); no API key is provisioned for the bench.
  assert(
    ACP_AGENTS.codex.authMode === "subscription",
    `codex authMode is "${ACP_AGENTS.codex.authMode}" but the bench logs in ` +
      `through the ChatGPT subscription, not an API key`,
  );
});

Deno.test("ACP_LIB_VERSION tracks the import-map pin", async () => {
  // The constant is folded into the benchmark cache key, so a lib bump is
  // supposed to invalidate stale verdicts. It only does that while the two
  // agree. Found drifted 2026-08-15: the import map had moved to
  // @agentclientprotocol/sdk@1.3.0 while this still read 0.4.5 — the migration
  // invalidated the cache through the registry fingerprint instead, by luck,
  // and the next sdk-only bump would have invalidated nothing.
  const denoJson = JSON.parse(
    await Deno.readTextFile(new URL("../../../../deno.json", import.meta.url)),
  ) as { imports: Record<string, string> };
  const spec = denoJson.imports["@agentclientprotocol/sdk"];
  assert(spec, "deno.json must pin @agentclientprotocol/sdk");
  const pinned = spec.slice(spec.lastIndexOf("@") + 1);
  assertEquals(
    ACP_LIB_VERSION,
    pinned,
    `ACP_LIB_VERSION (${ACP_LIB_VERSION}) must equal the import-map pin (${pinned})`,
  );
});
