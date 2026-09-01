import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { codexExecArgs, codexPrompt } from "./llm.ts";

Deno.test("codexExecArgs: pins model and reasoning effort on the command line", () => {
  // The bench CODEX_HOME holds auth only, but a stray ~/.codex/config.toml on
  // any other host sets model + effort globally. Both must come from the
  // campaign, never from whoever's machine launched it.
  const args = codexExecArgs({
    model: "gpt-5.6-sol",
    effort: "medium",
    lastMessageFile: "/tmp/out.txt",
  });
  assertEquals(args[0], "exec");
  const i = args.indexOf("--model");
  assertEquals(args[i + 1], "gpt-5.6-sol");
  assertStringIncludes(args.join(" "), 'model_reasoning_effort="medium"');
  assertStringIncludes(args.join(" "), "--ignore-user-config");
});

Deno.test("codexExecArgs: the emulator may not touch the workspace", () => {
  // It plays the human in a conversation; it has no business editing files,
  // and a read-only sandbox makes that structural rather than a promise.
  const args = codexExecArgs({
    model: "gpt-5.6-sol",
    effort: "medium",
    lastMessageFile: "/tmp/out.txt",
  });
  const s = args.join(" ");
  assertStringIncludes(s, "--sandbox read-only");
  assertStringIncludes(s, "--skip-git-repo-check");
});

Deno.test("codexExecArgs: routes the final reply to a file and reads the prompt from stdin", () => {
  const args = codexExecArgs({
    model: "m",
    effort: "medium",
    lastMessageFile: "/tmp/reply.txt",
  });
  const i = args.indexOf("--output-last-message");
  assertEquals(args[i + 1], "/tmp/reply.txt");
  // `-` is codex's "prompt arrives on stdin" marker and MUST come last.
  assertEquals(args[args.length - 1], "-");
});

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

Deno.test("codexExecArgs: attaches an output schema when the caller needs structured JSON", () => {
  const args = codexExecArgs({
    model: "gpt-5.6-sol",
    effort: "medium",
    lastMessageFile: "/tmp/reply",
    outputSchemaFile: "/tmp/schema.json",
  });
  const i = args.indexOf("--output-schema");
  assert(i >= 0, "structured verdicts need --output-schema");
  assertEquals(args[i + 1], "/tmp/schema.json");
  // Without a schema the flag must be absent — a free-text emulator turn is
  // not JSON, and codex would reject the reply against an empty schema.
  const plain = codexExecArgs({
    model: "gpt-5.6-sol",
    effort: "medium",
    lastMessageFile: "/tmp/reply",
  });
  assertEquals(plain.includes("--output-schema"), false);
});
