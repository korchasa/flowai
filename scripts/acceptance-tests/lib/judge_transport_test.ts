/**
 * Judge transport tests (FR-ACCEPT.JUDGE-ACP): a claude model goes over the
 * claude ACP bridge, every other model over the codex app-server. The claude
 * path is driven by the real local `stub_agent.ts` ACP server through the
 * ai-ide-cli connection — no LLM, no network.
 */
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
  chatCompletion,
  type ClaudeCallConfig,
  closeJudgeSessions,
  judgeTransportFor,
  parseStructuredReply,
} from "./judge_transport.ts";

const STUB = fromFileUrl(new URL("./acp/stub_agent.ts", import.meta.url));

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    item: {
      type: "object",
      properties: { pass: { type: "boolean" }, reason: { type: "string" } },
      required: ["pass", "reason"],
      additionalProperties: false,
    },
  },
  required: ["item"],
  additionalProperties: false,
};

async function stubConfig(
  extra: Partial<ClaudeCallConfig> = {},
): Promise<ClaudeCallConfig> {
  const cwd = await Deno.makeTempDir({ prefix: "judge-transport-test-" });
  return {
    model: "claude-test-model",
    effort: "medium",
    cwd,
    launch: { command: Deno.execPath(), args: ["run", "-A", STUB] },
    ...extra,
  };
}

/** Run `fn` on a fresh stub config, then close every bridge and the cwd. */
function stubTest(
  name: string,
  fn: (config: ClaudeCallConfig) => Promise<void>,
  extra: Partial<ClaudeCallConfig> = {},
) {
  Deno.test({
    name,
    sanitizeResources: false,
    sanitizeOps: false,
    fn: async () => {
      const config = await stubConfig(extra);
      try {
        await fn(config);
      } finally {
        await closeJudgeSessions();
        await Deno.remove(config.cwd!, { recursive: true });
      }
    },
  });
}

async function meta(config: ClaudeCallConfig) {
  const res = await chatCompletion(
    [{ role: "user", content: "[[META]]" }],
    config,
  );
  return JSON.parse(res.content);
}

Deno.test("judgeTransportFor: claude models go to acp, others to codex", () => {
  assertEquals(judgeTransportFor("claude-sonnet-5-5"), "claude-acp");
  assertEquals(judgeTransportFor("Claude-Opus-5-5"), "claude-acp");
  assertEquals(judgeTransportFor("gpt-5.6-sol"), "codex-appserver");
  assertEquals(judgeTransportFor("o4-mini"), "codex-appserver");
});

// --- parseStructuredReply ---

Deno.test("parseStructuredReply-fenced: a ```json fence is stripped", () => {
  const got = parseStructuredReply(
    '```json\n{"item": {"pass": true, "reason": "ok"}}\n```',
    VERDICT_SCHEMA,
  );
  assertEquals(got, { item: { pass: true, reason: "ok" } });
});

Deno.test("parseStructuredReply-prose: text around the object is ignored", () => {
  const got = parseStructuredReply(
    'Here is the verdict: {"item": {"pass": false, "reason": "no {x}"}} — done.',
    VERDICT_SCHEMA,
  );
  assertEquals(got, { item: { pass: false, reason: "no {x}" } });
});

Deno.test("parseStructuredReply-missing-required: names the missing key", () => {
  assertThrows(
    () => parseStructuredReply('{"item": {"pass": true}}', VERDICT_SCHEMA),
    Error,
    "item.reason",
  );
});

Deno.test("parseStructuredReply-wrong-type: names the field and the type", () => {
  assertThrows(
    () =>
      parseStructuredReply(
        '{"item": {"pass": "yes", "reason": "r"}}',
        VERDICT_SCHEMA,
      ),
    Error,
    "item.pass",
  );
});

Deno.test("parseStructuredReply-extra-key: additionalProperties false is enforced", () => {
  assertThrows(
    () =>
      parseStructuredReply(
        '{"item": {"pass": true, "reason": "r"}, "other": 1}',
        VERDICT_SCHEMA,
      ),
    Error,
    "other",
  );
});

Deno.test("parseStructuredReply-no-json: a reply without an object throws", () => {
  assertThrows(
    () => parseStructuredReply("I cannot evaluate this.", VERDICT_SCHEMA),
    Error,
    "no JSON object",
  );
});

// --- the claude path over the stub bridge ---

stubTest(
  "the pinned effort reaches _meta.claudeCode.options",
  async (config) => {
    const seen = await meta(config);
    const options = seen.meta.claudeCode.options;
    assertEquals(options.tools, []);
    assertEquals(options.settingSources, []);
    assertEquals(options.effort, "high");
    assertEquals(typeof options.systemPrompt, "string");
    assertEquals(seen.model, "claude-test-model");
    assertEquals(seen.open, 1);
  },
  { effort: "high" },
);

stubTest(
  "calls on one key share one bridge process",
  async (config) => {
    const first = await meta(config);
    const second = await meta(config);
    assertEquals(second.pid, first.pid);
    assert(second.sessionId !== first.sessionId);
    // The first call's session was closed on the bridge.
    assertEquals(second.open, 1);
  },
);

stubTest(
  "judge usage comes from the turn-end event",
  async (config) => {
    const res = await chatCompletion(
      [
        { role: "system", content: "You are a judge." },
        {
          role: "user",
          content:
            '[[REPLY]]```json\n{"item": {"pass": true, "reason": "seen"}}\n```[[/REPLY]]',
        },
      ],
      config,
    );
    assertEquals(JSON.parse(res.content), {
      item: { pass: true, reason: "seen" },
    });
    // `STUB_USAGE`, as the bridge reports it on the prompt response.
    assertEquals(res.usage, {
      freshInput: 100,
      cachedInput: 30,
      cacheWrite: 5,
      output: 20,
      reasoning: 0,
      total: 155,
    });
  },
  { jsonSchema: VERDICT_SCHEMA },
);

stubTest(
  "a reply that breaks the schema rejects",
  async (config) => {
    await assertRejects(
      () =>
        chatCompletion(
          [{
            role: "user",
            content: '[[REPLY]]{"item": {"pass": true}}[[/REPLY]]',
          }],
          config,
        ),
      Error,
      "item.reason",
    );
  },
  { jsonSchema: VERDICT_SCHEMA },
);

stubTest(
  "a dying bridge rejects and the next call starts a fresh one",
  async (config) => {
    const before = await meta(config);
    await assertRejects(
      () => chatCompletion([{ role: "user", content: "[[CRASH]]" }], config),
      Error,
      "claude judge bridge",
    );
    const after = await meta(config);
    assert(after.pid !== before.pid);
    assertEquals(after.open, 1);
  },
);

Deno.test({
  name: "the caller's env reaches the bridge",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const home = await Deno.makeTempDir({ prefix: "judge-transport-home-" });
    const config = await stubConfig({ env: { HOME: home } });
    try {
      assertEquals((await meta(config)).home, home);
    } finally {
      await closeJudgeSessions();
      await Deno.remove(config.cwd!, { recursive: true });
      await Deno.remove(home, { recursive: true });
    }
  },
});
