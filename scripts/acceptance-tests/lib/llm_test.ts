import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  AppServerSession,
  closeCodexSessions,
  codexChatCompletion,
  codexPrompt,
  codexSessionKey,
  finalAgentMessage,
  prewarmCodexSession,
  threadStartParams,
  turnStartParams,
} from "./llm.ts";
import {
  type FakeAppServer,
  fakeAppServerBinary,
  type FakeAppServerOptions,
} from "./testing/fake_appserver.ts";

/**
 * Run `fn` against one fake app-server binary — a real child process the
 * ai-ide-cli client spawns — then close every session and remove the fake.
 */
function withFake(
  name: string,
  opts: FakeAppServerOptions,
  fn: (fake: FakeAppServer) => Promise<void>,
) {
  Deno.test({
    name,
    sanitizeResources: false,
    sanitizeOps: false,
    fn: async () => {
      const fake = await fakeAppServerBinary(opts);
      try {
        await fn(fake);
      } finally {
        closeCodexSessions();
        await fake.cleanup();
      }
    },
  });
}

/** One session on `fake`, closed after `fn`. */
async function onSession<T>(
  fake: FakeAppServer,
  fn: (s: AppServerSession) => Promise<T>,
): Promise<T> {
  const session = new AppServerSession({
    model: "m",
    effort: "medium",
    cwd: "/tmp/x",
    binary: fake.binary,
  });
  try {
    return await fn(session);
  } finally {
    session.close();
  }
}

const methods = async (fake: FakeAppServer) =>
  (await fake.seen()).map((m) => m.method);

Deno.test("codexPrompt: folds the system message ahead of the conversation", () => {
  // `codex exec` takes ONE prompt — there is no separate system channel, so the
  // persona has to lead the text or it is simply lost.
  const p = codexPrompt([
    { role: "system", content: "You are the human." },
    { role: "user", content: "Engineer said hello." },
  ]);
  assertStringIncludes(p, "You are the human.");
  assertStringIncludes(p, "Engineer said hello.");
  assertEquals(p.indexOf("You are the human.") < p.indexOf("Engineer"), true);
});

Deno.test("codexPrompt: keeps every non-system turn in order", () => {
  const p = codexPrompt([
    { role: "user", content: "first" },
    { role: "assistant", content: "second" },
    { role: "user", content: "third" },
  ]);
  assertEquals(p.indexOf("first") < p.indexOf("second"), true);
  assertEquals(p.indexOf("second") < p.indexOf("third"), true);
});

// --- app-server transport (FR-ACCEPT.JUDGE-APPSERVER) ---

Deno.test("codexSessionKey separates callers that must not share a session", () => {
  const base = { model: "m", effort: "medium", env: { CODEX_HOME: "/a" } };
  assertEquals(codexSessionKey(base), codexSessionKey({ ...base }));
  assert(codexSessionKey(base) !== codexSessionKey({ ...base, effort: "low" }));
  assert(codexSessionKey(base) !== codexSessionKey({ ...base, model: "n" }));
  assert(
    codexSessionKey(base) !==
      codexSessionKey({ ...base, env: { CODEX_HOME: "/b" } }),
    "two isolated CODEX_HOMEs must not share one app-server child",
  );
});

// --- app-server request params ---

Deno.test("threadStartParams pins isolation structurally, not by prompt", () => {
  const p = threadStartParams({
    model: "gpt-5.6-sol",
    effort: "medium",
    cwd: "/tmp/judge",
  });
  assertEquals(p.cwd, "/tmp/judge");
  assertEquals(p.sandbox, "read-only");
  assertEquals(p.ephemeral, true);
  assertEquals(p.model, "gpt-5.6-sol");
});

Deno.test("turnStartParams pins model and effort on every turn", () => {
  const p = turnStartParams({
    threadId: "t1",
    prompt: "hello",
    model: "gpt-5.6-sol",
    effort: "low",
  });
  assertEquals(p.threadId, "t1");
  assertEquals(p.model, "gpt-5.6-sol");
  assertEquals(p.effort, "low");
  assertEquals(p.input, [{ type: "text", text: "hello" }]);
  assert(!("outputSchema" in p), "no schema must mean no outputSchema key");
});

Deno.test("turnStartParams forwards a JSON schema when the caller supplies one", () => {
  const schema = { type: "object", properties: { ok: { type: "boolean" } } };
  const p = turnStartParams({
    threadId: "t1",
    prompt: "hi",
    model: "m",
    effort: "medium",
    outputSchema: schema,
  });
  assertEquals(p.outputSchema, schema);
});

Deno.test("finalAgentMessage returns the last agent message of the turn", () => {
  const text = finalAgentMessage({
    status: "completed",
    items: [
      { type: "reasoning", text: "thinking" },
      { type: "agentMessage", text: "first" },
      { type: "agentMessage", text: "final" },
    ],
  });
  assertEquals(text, "final");
});

Deno.test("finalAgentMessage falls back to the streamed items when the turn carries none", () => {
  // codex-cli 0.144.6 sends `items: []` / `itemsView: "notLoaded"` on
  // turn/completed; the answer only ever arrived via item/completed.
  const text = finalAgentMessage({ status: "completed", items: [] }, [
    { type: "userMessage", text: "ask" },
    { type: "agentMessage", text: "pong" },
  ]);
  assertEquals(text, "pong");
});

Deno.test("finalAgentMessage rejects a turn that did not complete", () => {
  let message = "";
  try {
    finalAgentMessage({
      status: "failed",
      items: [],
      error: { message: "model overloaded" },
    });
  } catch (e) {
    message = (e as Error).message;
  }
  assertStringIncludes(message, "failed");
  assertStringIncludes(message, "model overloaded");
});

Deno.test("finalAgentMessage rejects an empty reply instead of returning it", () => {
  let message = "";
  try {
    finalAgentMessage({ status: "completed", items: [] }, [
      { type: "agentMessage", text: "   " },
    ]);
  } catch (e) {
    message = (e as Error).message;
  }
  assertStringIncludes(message, "empty");
});

// --- transport, driven against a protocol-speaking fake in place of codex ---

withFake(
  "AppServerSession opens its thread before the first prompt exists",
  {},
  (fake) =>
    onSession(fake, async (session) => {
      await session.ready();
      const seen = await methods(fake);
      assert(
        seen.includes("thread/start"),
        "thread must be open after ready()",
      );
      assert(!seen.includes("turn/start"), "no turn may run during prewarm");
    }),
);

withFake(
  "AppServerSession returns the turn's final agent message",
  {},
  (fake) =>
    onSession(fake, async (session) => {
      assertEquals((await session.run("ping")).text, "echo:ping");
    }),
);

withFake(
  "AppServerSession gives each call its own thread",
  {},
  (fake) =>
    onSession(fake, async (session) => {
      await session.run("one");
      await session.run("two");
      const turns = (await fake.seen())
        .filter((m) => m.method === "turn/start")
        .map((m) => (m.params as { threadId: string }).threadId);
      assertEquals(turns.length, 2);
      assert(
        turns[0] !== turns[1],
        "a second call must not reuse the first thread",
      );
    }),
);

withFake(
  "AppServerSession surfaces a failed turn as an error",
  { status: "failed", errorMessage: "usage limit" },
  (fake) =>
    onSession(fake, async (session) => {
      const message = await session.run("ping").then(
        () => "",
        (e) => (e as Error).message,
      );
      assertStringIncludes(message, "usage limit");
    }),
);

withFake(
  "AppServerSession fails a live turn when the child dies after acknowledging it",
  // The turn/start request already resolved, so only the turn waiter is left;
  // a judge call without an abort signal would otherwise wait forever.
  { closeAfterTurnAck: true },
  (fake) =>
    onSession(fake, async (session) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const outcome = await Promise.race([
          session.run("ping").then(
            () => "resolved",
            (e) => `rejected: ${(e as Error).message}`,
          ),
          new Promise<string>((r) => {
            timer = setTimeout(() => r("still waiting after 5 s"), 5000);
          }),
        ]);
        assertStringIncludes(outcome, "rejected: Codex app-server closed");
      } finally {
        clearTimeout(timer);
      }
    }),
);

withFake(
  "AppServerSession keeps two overlapping turns apart",
  // One child serves several scenarios at once under `-p N`. The protocol
  // frames carry the thread id; without routing on it the two answers swap.
  { turnDelayMs: 25 },
  (fake) =>
    onSession(fake, async (session) => {
      await session.ready();
      const [a, b] = await Promise.all([
        session.run("alpha"),
        session.run("beta"),
      ]);
      assertEquals(a.text, "echo:alpha");
      assertEquals(b.text, "echo:beta");
    }),
);

withFake(
  "AppServerSession reports what the turn cost, cache and reasoning split out",
  // Real frame: `inputTokens` already includes `cachedInputTokens`, and
  // `outputTokens` already includes `reasoningOutputTokens`.
  {
    tokenUsage: {
      inputTokens: 1000,
      cachedInputTokens: 900,
      outputTokens: 50,
      reasoningOutputTokens: 20,
      totalTokens: 1050,
    },
  },
  (fake) =>
    onSession(fake, async (session) => {
      const { usage } = await session.run("ping");
      assertEquals(usage.freshInput, 100);
      assertEquals(usage.cachedInput, 900);
      assertEquals(usage.output, 30);
      assertEquals(usage.reasoning, 20);
      assertEquals(usage.total, 1050);
    }),
);

withFake(
  "AppServerSession reports zeros when the server sends no usage frame",
  {},
  (fake) =>
    onSession(fake, async (session) => {
      const { usage } = await session.run("ping");
      assertEquals(usage.total, 0);
    }),
);

withFake(
  "codexChatCompletion answers over the app-server transport",
  {},
  async (fake) => {
    const res = await codexChatCompletion(
      [{ role: "user", content: "ping" }],
      { model: "m", effort: "medium", binary: fake.binary },
    );
    assertEquals(res.content, "echo:[user]\nping");
    assert(
      (await methods(fake)).includes("turn/start"),
      "the turn must run over turn/start",
    );
  },
);

withFake(
  "a prewarmed session serves the call that follows it",
  {},
  async (fake) => {
    const config = { model: "m", effort: "medium", binary: fake.binary };
    await prewarmCodexSession(config);
    assertEquals(
      await fake.spawns(),
      1,
      "prewarm must open the session ahead of the prompt",
    );
    await codexChatCompletion([{ role: "user", content: "ping" }], config);
    assertEquals(
      await fake.spawns(),
      1,
      "the call must reuse the prewarmed session",
    );
  },
);

withFake(
  "a failed prewarm degrades to opening the session at call time",
  { failHandshake: true },
  async (broken) => {
    const working = await fakeAppServerBinary();
    try {
      // The pool key leaves the binary out, so the second config reaches the
      // entry the failed prewarm would have left behind.
      await prewarmCodexSession({
        model: "m",
        effort: "medium",
        binary: broken.binary,
      });
      const res = await codexChatCompletion(
        [{ role: "user", content: "ping" }],
        { model: "m", effort: "medium", binary: working.binary },
      );
      assertEquals(res.content, "echo:[user]\nping");
      assertEquals(await broken.spawns(), 1);
      assertEquals(
        await working.spawns(),
        1,
        "the broken session must not be reused",
      );
    } finally {
      await working.cleanup();
    }
  },
);

withFake(
  "codexChatCompletion refuses an empty reply",
  { status: "failed", errorMessage: "usage limit" },
  async (fake) => {
    const message = await codexChatCompletion(
      [{ role: "user", content: "ping" }],
      { model: "m", effort: "medium", binary: fake.binary },
    ).then(() => "", (e) => (e as Error).message);
    assertStringIncludes(message, "usage limit");
  },
);
