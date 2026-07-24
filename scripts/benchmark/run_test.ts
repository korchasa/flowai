import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  assertModelForIde,
  codexAgentEnv,
  effortEnv,
  isAuthFailure,
  isTransientSetupFailure,
} from "./run.ts";

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
