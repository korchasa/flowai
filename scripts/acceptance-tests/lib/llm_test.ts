import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  closeCodexSessions,
  codexChatCompletion,
  codexPrompt,
  codexSessionKey,
  prewarmCodexSession,
} from "./llm.ts";
import { fakeAppServer } from "./testing/fake_appserver.ts";

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

Deno.test("codexChatCompletion answers over the app-server transport", async () => {
  const fake = fakeAppServer();
  try {
    const res = await codexChatCompletion(
      [{ role: "user", content: "ping" }],
      { model: "m", effort: "medium", spawn: () => fake.process },
    );
    assertEquals(res.content, "echo:[user]\nping");
    const methods = fake.seen.map((m) => m.method);
    assert(methods.includes("turn/start"), "the turn must run over turn/start");
  } finally {
    closeCodexSessions();
  }
});

Deno.test("a prewarmed session serves the call that follows it", async () => {
  let spawns = 0;
  const fake = fakeAppServer();
  const spawn = () => {
    spawns += 1;
    return fake.process;
  };
  try {
    await prewarmCodexSession({ model: "m", effort: "medium", spawn });
    assertEquals(
      spawns,
      1,
      "prewarm must open the session ahead of the prompt",
    );
    await codexChatCompletion([{ role: "user", content: "ping" }], {
      model: "m",
      effort: "medium",
      spawn,
    });
    assertEquals(spawns, 1, "the call must reuse the prewarmed session");
  } finally {
    closeCodexSessions();
  }
});

Deno.test("a failed prewarm degrades to opening the session at call time", async () => {
  let spawns = 0;
  const spawn = () => {
    spawns += 1;
    return spawns === 1
      ? fakeAppServer({ failHandshake: true }).process
      : fakeAppServer().process;
  };
  try {
    await prewarmCodexSession({ model: "m", effort: "medium", spawn });
    const res = await codexChatCompletion([{ role: "user", content: "ping" }], {
      model: "m",
      effort: "medium",
      spawn,
    });
    assertEquals(res.content, "echo:[user]\nping");
    assertEquals(spawns, 2, "the broken session must not be reused");
  } finally {
    closeCodexSessions();
  }
});

Deno.test("codexChatCompletion refuses an empty reply", async () => {
  const fake = fakeAppServer({ status: "failed", errorMessage: "usage limit" });
  let message = "";
  try {
    await codexChatCompletion([{ role: "user", content: "ping" }], {
      model: "m",
      effort: "medium",
      spawn: () => fake.process,
    });
  } catch (e) {
    message = (e as Error).message;
  } finally {
    closeCodexSessions();
  }
  assertStringIncludes(message, "usage limit");
});
