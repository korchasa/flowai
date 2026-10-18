/**
 * Claude judge transport tests (FR-ACCEPT.JUDGE-ACP), driven by the real local
 * `stub_agent.ts` ACP server — no LLM, no network.
 */
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
  type ClaudeCallConfig,
  claudeChatCompletion,
  closeClaudeJudgeSessions,
  parseStructuredReply,
} from "./claude_judge.ts";
import { tokensFromAcpUsage } from "../token_usage.ts";
import { STUB_USAGE } from "./stub_agent.ts";

const STUB = fromFileUrl(new URL("./stub_agent.ts", import.meta.url));

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
  const cwd = await Deno.makeTempDir({ prefix: "claude-judge-test-" });
  return {
    model: "claude-test-model",
    effort: "medium",
    cwd,
    launch: { command: Deno.execPath(), args: ["run", "-A", STUB] },
    ...extra,
  };
}

const opts = { sanitizeResources: false, sanitizeOps: false };

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

// --- tokensFromAcpUsage ---

Deno.test("tokensFromAcpUsage-disjoint: fields map without subtraction", () => {
  assertEquals(tokensFromAcpUsage(STUB_USAGE), {
    freshInput: 100,
    cachedInput: 30,
    cacheWrite: 5,
    output: 20,
    reasoning: 0,
    total: 155,
  });
});

Deno.test("tokensFromAcpUsage-optional: absent cache fields read as 0", () => {
  assertEquals(
    tokensFromAcpUsage({ inputTokens: 7, outputTokens: 3, totalTokens: 10 }),
    {
      freshInput: 7,
      cachedInput: 0,
      cacheWrite: 0,
      output: 3,
      reasoning: 0,
      total: 10,
    },
  );
});

// --- claudeChatCompletion over the stub bridge ---

Deno.test({
  name:
    "claudeChatCompletion-session-options: no tools, no settings, pinned effort and model",
  ...opts,
  fn: async () => {
    const config = await stubConfig();
    try {
      const res = await claudeChatCompletion(
        [{ role: "user", content: "[[META]]" }],
        config,
      );
      const seen = JSON.parse(res.content);
      const options = seen.meta.claudeCode.options;
      assertEquals(options.tools, []);
      assertEquals(options.settingSources, []);
      assertEquals(options.effort, "medium");
      assertEquals(typeof options.systemPrompt, "string");
      assertEquals(seen.model, "claude-test-model");
      assertEquals(seen.open, 1);
    } finally {
      await closeClaudeJudgeSessions();
      await Deno.remove(config.cwd!, { recursive: true });
    }
  },
});

Deno.test({
  name:
    "claudeChatCompletion-reuse: the second call reuses the bridge and the first session is closed",
  ...opts,
  fn: async () => {
    const config = await stubConfig();
    try {
      const first = JSON.parse(
        (await claudeChatCompletion(
          [{ role: "user", content: "[[META]]" }],
          config,
        ))
          .content,
      );
      const second = JSON.parse(
        (await claudeChatCompletion(
          [{ role: "user", content: "[[META]]" }],
          config,
        ))
          .content,
      );
      assertEquals(second.pid, first.pid);
      assert(second.sessionId !== first.sessionId);
      assertEquals(second.open, 1);
    } finally {
      await closeClaudeJudgeSessions();
      await Deno.remove(config.cwd!, { recursive: true });
    }
  },
});

Deno.test({
  name:
    "claudeChatCompletion-structured: a schema-valid reply comes back as JSON with usage",
  ...opts,
  fn: async () => {
    const config = await stubConfig({ jsonSchema: VERDICT_SCHEMA });
    try {
      const res = await claudeChatCompletion(
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
      assertEquals(res.usage?.total, 155);
      assertEquals(res.usage?.cachedInput, 30);
    } finally {
      await closeClaudeJudgeSessions();
      await Deno.remove(config.cwd!, { recursive: true });
    }
  },
});

Deno.test({
  name: "claudeChatCompletion-schema-mismatch: an invalid reply rejects",
  ...opts,
  fn: async () => {
    const config = await stubConfig({ jsonSchema: VERDICT_SCHEMA });
    try {
      await assertRejects(
        () =>
          claudeChatCompletion(
            [{
              role: "user",
              content: '[[REPLY]]{"item": {"pass": true}}[[/REPLY]]',
            }],
            config,
          ),
        Error,
        "item.reason",
      );
    } finally {
      await closeClaudeJudgeSessions();
      await Deno.remove(config.cwd!, { recursive: true });
    }
  },
});

Deno.test({
  name:
    "claudeChatCompletion-crash: a dying bridge rejects and the next call starts a fresh one",
  ...opts,
  fn: async () => {
    const config = await stubConfig();
    try {
      await assertRejects(
        () =>
          claudeChatCompletion(
            [{ role: "user", content: "[[CRASH]]" }],
            config,
          ),
        Error,
        "claude judge bridge",
      );
      const res = await claudeChatCompletion(
        [{ role: "user", content: "[[META]]" }],
        config,
      );
      assertEquals(JSON.parse(res.content).open, 1);
    } finally {
      await closeClaudeJudgeSessions();
      await Deno.remove(config.cwd!, { recursive: true });
    }
  },
});

Deno.test({
  name: "claudeChatCompletion-env: the caller's env reaches the bridge",
  ...opts,
  fn: async () => {
    const home = await Deno.makeTempDir({ prefix: "claude-judge-home-" });
    const config = await stubConfig({ env: { HOME: home } });
    try {
      const res = await claudeChatCompletion(
        [{ role: "user", content: "[[META]]" }],
        config,
      );
      assertEquals(JSON.parse(res.content).home, home);
    } finally {
      await closeClaudeJudgeSessions();
      await Deno.remove(config.cwd!, { recursive: true });
      await Deno.remove(home, { recursive: true });
    }
  },
});
