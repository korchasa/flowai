import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  AppServerSession,
  finalAgentMessage,
  threadStartParams,
  turnStartParams,
} from "./appserver_client.ts";
import { fakeAppServer } from "./testing/fake_appserver.ts";

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

Deno.test("AppServerSession opens its thread before the first prompt exists", async () => {
  const fake = fakeAppServer();
  const session = new AppServerSession({
    model: "m",
    effort: "medium",
    cwd: "/tmp/x",
    spawn: () => fake.process,
  });
  try {
    await session.ready();
    const methods = fake.seen.map((m) => m.method);
    assert(
      methods.includes("thread/start"),
      "thread must be open after ready()",
    );
    assert(!methods.includes("turn/start"), "no turn may run during prewarm");
  } finally {
    session.close();
  }
});

Deno.test("AppServerSession returns the turn's final agent message", async () => {
  const fake = fakeAppServer();
  const session = new AppServerSession({
    model: "m",
    effort: "medium",
    cwd: "/tmp/x",
    spawn: () => fake.process,
  });
  try {
    assertEquals((await session.run("ping")).text, "echo:ping");
  } finally {
    session.close();
  }
});

Deno.test("AppServerSession gives each call its own thread", async () => {
  const fake = fakeAppServer();
  const session = new AppServerSession({
    model: "m",
    effort: "medium",
    cwd: "/tmp/x",
    spawn: () => fake.process,
  });
  try {
    await session.run("one");
    await session.run("two");
    const turns = fake.seen
      .filter((m) => m.method === "turn/start")
      .map((m) => (m.params as { threadId: string }).threadId);
    assertEquals(turns.length, 2);
    assert(
      turns[0] !== turns[1],
      "a second call must not reuse the first thread",
    );
  } finally {
    session.close();
  }
});

Deno.test("AppServerSession surfaces a failed turn as an error", async () => {
  const fake = fakeAppServer({ status: "failed", errorMessage: "usage limit" });
  const session = new AppServerSession({
    model: "m",
    effort: "medium",
    cwd: "/tmp/x",
    spawn: () => fake.process,
  });
  let message = "";
  try {
    await session.run("ping");
  } catch (e) {
    message = (e as Error).message;
  } finally {
    session.close();
  }
  assertStringIncludes(message, "usage limit");
});

Deno.test("AppServerSession keeps two overlapping turns apart", async () => {
  // One child serves several scenarios at once under `-p N`. The protocol
  // frames carry the thread id; without routing on it the two answers swap.
  const fake = fakeAppServer({ turnDelayMs: 25 });
  const session = new AppServerSession({
    model: "m",
    effort: "medium",
    cwd: "/tmp/x",
    spawn: () => fake.process,
  });
  try {
    await session.ready();
    const [a, b] = await Promise.all([
      session.run("alpha"),
      session.run("beta"),
    ]);
    assertEquals(a.text, "echo:alpha");
    assertEquals(b.text, "echo:beta");
  } finally {
    session.close();
  }
});

Deno.test("AppServerSession reports what the turn cost, cache and reasoning split out", async () => {
  // Real frame: `inputTokens` already includes `cachedInputTokens`, and
  // `outputTokens` already includes `reasoningOutputTokens`.
  const fake = fakeAppServer({
    tokenUsage: {
      inputTokens: 1000,
      cachedInputTokens: 900,
      outputTokens: 50,
      reasoningOutputTokens: 20,
      totalTokens: 1050,
    },
  });
  const session = new AppServerSession({
    model: "m",
    effort: "medium",
    cwd: "/tmp/x",
    spawn: () => fake.process,
  });
  try {
    const { usage } = await session.run("ping");
    assertEquals(usage.freshInput, 100);
    assertEquals(usage.cachedInput, 900);
    assertEquals(usage.output, 30);
    assertEquals(usage.reasoning, 20);
    assertEquals(usage.total, 1050);
  } finally {
    session.close();
  }
});

Deno.test("AppServerSession reports zeros when the server sends no usage frame", async () => {
  const fake = fakeAppServer();
  const session = new AppServerSession({
    model: "m",
    effort: "medium",
    cwd: "/tmp/x",
    spawn: () => fake.process,
  });
  try {
    const { usage } = await session.run("ping");
    assertEquals(usage.total, 0);
  } finally {
    session.close();
  }
});
