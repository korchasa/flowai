import { assert, assertEquals, assertThrows } from "@std/assert";
import { isAbsolute } from "@std/path";
import {
  assertModelForIde,
  codexAgentEnv,
  effortEnv,
  emulatorEnvFor,
  humanEmulatorConfig,
  isAuthFailure,
  isEmulatorOutage,
  isTransientSetupFailure,
  repoCacheDir,
  timeoutLog,
} from "./run.ts";

/**
 * The cache dir is handed to pip as `PIP_CACHE_DIR`, and pip runs with the
 * SANDBOX as its cwd. A relative path therefore resolves inside the sandbox,
 * where every downloaded wheel becomes an untracked file the diff capture picks
 * up as the agent's work. Measured 2026-08-02: two sessions of a campaign
 * started with a relative `--out` shipped 262 KB / 158 files and 534 KB / 218
 * files, of which the actual fix was one and two files.
 */
Deno.test("repoCacheDir: absolute whatever the caller passed", () => {
  const rel = repoCacheDir("scripts/benchmark/runs/pool2-flowai-bounded/rep1");
  assert(
    isAbsolute(rel),
    `relative outDir must still yield an absolute cache dir: ${rel}`,
  );
  assert(rel.endsWith("/pool2-flowai-bounded/_repo-cache"), rel);

  // An absolute outDir keeps its own root — the fix must not re-anchor it.
  assertEquals(
    repoCacheDir("/tmp/campaign/rep2"),
    "/tmp/campaign/_repo-cache",
  );
});

/**
 * A session that hits the wall clock is the one that most needs a transcript,
 * and it used to be the only one that had none: the timeout branch returned the
 * marker alone and dropped everything the agent had accumulated. Four of fifteen
 * instances in the first flowai campaign (2026-07-27) left a 41-byte log — no
 * turns, no commands, nothing to diagnose.
 */
Deno.test("timeoutLog: the partial transcript survives the timeout, marker last", () => {
  const partial = "[health] ok\n\n[turn 1] > $plan …\n< a plan\n";
  const out = timeoutLog(partial, "session timeout after 1200000ms");

  assert(out.startsWith(partial), "everything logged before the cap is kept");
  assert(
    out.includes("[TIMEOUT] session timeout after 1200000ms"),
    "the marker still states why the session ended",
  );
  assert(
    out.trimEnd().endsWith("1200000ms"),
    "the marker goes last — it is the final event, not a header",
  );

  // A session that produced nothing before the cap still reports the cause.
  assertEquals(
    timeoutLog("", "session timeout after 1ms").trim(),
    "[TIMEOUT] session timeout after 1ms",
  );
});

Deno.test("effortEnv: pins CLAUDE_EFFORT and neutralizes the adaptive-thinking disable", () => {
  const env = effortEnv("high");
  assertEquals(env.CLAUDE_EFFORT, "high");
  // A shell that launched the bench with the disable set must not leak through:
  // effort is the sole reasoning control, so the disable is forced off.
  assertEquals(env.CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING, "0");
  assertEquals(effortEnv("low").CLAUDE_EFFORT, "low");
});

Deno.test("codexAgentEnv: pins effort AND model into the bridge session config", () => {
  // The codex bridge merges CODEX_CONFIG into the session config, which is the
  // only lever that overrides the developer's ~/.codex/config.toml — where this
  // host globally sets model_reasoning_effort="ultra" and model="gpt-5.6-sol".
  const env = codexAgentEnv("high", "gpt-5.6-sol");
  const cfg = JSON.parse(env.CODEX_CONFIG);
  assertEquals(cfg.model_reasoning_effort, "high");
  assertEquals(cfg.model, "gpt-5.6-sol");
  // Effort tracks the campaign value, not a constant.
  assertEquals(
    JSON.parse(codexAgentEnv("low", "gpt-5.6-sol").CODEX_CONFIG)
      .model_reasoning_effort,
    "low",
  );
});

Deno.test("assertModelForIde: a cross-IDE model is refused, not silently run", () => {
  // Running the codex arm with "sonnet" would hand the label to a bridge that
  // cannot serve it; the campaign would either die deep inside the session or
  // silently fall back to the user's configured model. Fail at the CLI edge.
  assertThrows(
    () => assertModelForIde("codex", "sonnet"),
    Error,
    "sonnet",
  );
  assertThrows(
    () => assertModelForIde("claude", "gpt-5.6-sol"),
    Error,
    "gpt-5.6-sol",
  );
  // Matching pairs pass.
  assertModelForIde("claude", "sonnet");
  assertModelForIde("claude", "claude-opus-4-5");
  assertModelForIde("codex", "gpt-5.6-sol");
  assertModelForIde("codex", "gpt-5.3-codex");
});

Deno.test("isAuthFailure: ACP -32000 token outage caught; app auth text does not false-trip", () => {
  // The exact rep-1 outage: OAuth token expired mid-batch, ACP raised the
  // JSON-RPC auth error, the session produced no diff.
  const outage =
    `< { code: -32000, message: 'Authentication required', data: undefined }\n` +
    `[acp-error] {"acpError":"[object Object]"}`;
  assert(isAuthFailure(outage), "token-expiry outage must be caught");
  // A repo whose OWN source mentions auth (HTTP 401 handler) must NOT be
  // mistaken for an outage — the -32000 code is ACP-internal, never app text.
  assertEquals(
    isAuthFailure(
      `Read auth.py: raise HTTPError(401, "Authentication required")`,
    ),
    false,
    "app text without -32000 is not an outage",
  );
  // A different ACP error is not an auth outage.
  assertEquals(
    isAuthFailure(`{ code: -32603, message: 'Internal error' }`),
    false,
  );
  assertEquals(isAuthFailure("normal successful session"), false);
});

Deno.test("isTransientSetupFailure: transient clone/DNS failures leave pending; permanent ones do not", () => {
  // The exact opus-probe outage: DNS blip during the clone stage.
  assert(
    isTransientSetupFailure(
      `git clone https://github.com/databricks/dbt-databricks.git /c/x.tmp failed: ` +
        `Cloning into '/c/x.tmp'...\nfatal: unable to access '...': Could not resolve host: github.com`,
    ),
    "DNS-blip clone must be retried, not banked as a miss",
  );
  // Connection reset / refused / timeout during clone are equally transient.
  assert(
    isTransientSetupFailure("git clone url tmp failed: Connection timed out"),
  );
  assert(
    isTransientSetupFailure(
      "git clone url tmp failed: Connection reset by peer",
    ),
  );
  // A PERMANENT bad base ref (youssofal) is not a transient setup failure — it
  // must stay a real miss so selection excludes it, not retry forever.
  assertEquals(
    isTransientSetupFailure(
      `git fetch origin c06cc13 failed: fatal: git upload-pack: not our ref c06cc13`,
    ),
    false,
    "unfetchable base ref is permanent, not transient",
  );
  // A genuine empty agent diff (no exception text) is not a setup failure.
  assertEquals(isTransientSetupFailure(""), false);
  assertEquals(isTransientSetupFailure("agent produced no changes"), false);
});

/**
 * The human emulator runs as a separate `codex exec` process, and its failure is
 * NOT an ACP error — `isAuthFailure` cannot see it. Measured 2026-07-30: the
 * account's OAuth refresh token was revoked server-side, every emulator call
 * died, and 14 of 15 sessions banked an empty patch as an honest miss. The turn
 * the human was supposed to take never happened, so the instance was never
 * fairly attempted — same class as a health abort or a clone blip.
 */
Deno.test("isEmulatorOutage: a dead human emulator leaves the instance unmeasured, not missed", () => {
  // Verbatim from the 2026-07-30 sessions (the result JSON is truncated in the
  // log, so the auth text itself never reaches us — the wrapper message does).
  const outage = `[acp-fatal] Error: Codex CLI failed (exit 1): stderr=(empty)`;
  assert(isEmulatorOutage(outage), "the emulator never spoke — leave pending");

  // Any exit code, not just 1: the point is that the CLI died before answering.
  assert(isEmulatorOutage(`Error: Codex CLI failed (exit 143): killed`));

  // A session where the emulator answered is a real attempt, whatever else the
  // log holds — including a repo whose own text talks about failing CLIs.
  assertEquals(isEmulatorOutage("normal successful session"), false);
  assertEquals(
    isEmulatorOutage(`README: "if the Codex CLI failed, retry the command"`),
    false,
    "prose without the wrapper's exit-code form is not an outage",
  );
});

Deno.test("humanEmulatorConfig: the referee is pinned, not inherited from the agent", () => {
  // One referee serves BOTH arms (FR-BENCH-SWE.SYMMETRY), so its operating point
  // must not move when the subject's does. The agent effort below varies; the
  // emulator's does not.
  assertEquals(humanEmulatorConfig({ effort: "high" }).effort, "medium");
  assertEquals(humanEmulatorConfig({ effort: "low" }).effort, "medium");
  assertEquals(humanEmulatorConfig({}).model, "gpt-5.6-sol");
});

Deno.test("humanEmulatorConfig: an explicit model still wins", () => {
  // A campaign may pin a different referee snapshot; the default is a default,
  // not a lock.
  assertEquals(
    humanEmulatorConfig({ humanEmulatorModel: "gpt-5.6-terra" }).model,
    "gpt-5.6-terra",
  );
});

/**
 * implements [FR-BENCH-SWE.ISOLATION]: the emulator shares the run's codex
 * store with the agent (one bench home under `~/.flowai-dev`) but NOT the
 * agent's environment. A spread of the agent env would carry `CODEX_CONFIG` —
 * the agent's model and effort, which the referee is pinned away from by argv —
 * and the sandbox venv `PATH`, and any key added there later would reach the
 * referee silently.
 */
Deno.test("emulatorEnvFor: exactly the two keys codex needs, nothing of the agent's", () => {
  const env = emulatorEnvFor({
    HOME: "/tmp/bench-home",
    CODEX_HOME: "/Users/x/.flowai-dev/bench/anyio-1134-abc/.codex",
  });
  assertEquals(env, {
    HOME: "/tmp/bench-home",
    CODEX_HOME: "/Users/x/.flowai-dev/bench/anyio-1134-abc/.codex",
  });
  assertEquals(Object.keys(env).sort(), ["CODEX_HOME", "HOME"]);
  assertEquals("CODEX_CONFIG" in env, false);
  assertEquals("PATH" in env, false);
  assertEquals("CLAUDE_EFFORT" in env, false);
});
