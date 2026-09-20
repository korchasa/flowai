import { assertEquals, assertThrows } from "@std/assert";
import {
  agentLaunchEnv,
  CLAUDE_THINKING_BUDGET,
  claudeAgentEnv,
  codexAgentEnv,
} from "./agent_env.ts";

Deno.test("codexAgentEnv: pins effort AND model into the bridge session config", () => {
  const cfg = JSON.parse(codexAgentEnv("high", "gpt-5.6-sol").CODEX_CONFIG);
  assertEquals(cfg, { model_reasoning_effort: "high", model: "gpt-5.6-sol" });
});

Deno.test("agentLaunchEnv: a codex session carries CODEX_CONFIG on top of the adapter env", () => {
  const env = agentLaunchEnv({
    ide: "codex",
    model: "gpt-5.6-terra",
    effort: "medium",
    base: { HOME: "/tmp/h", CODEX_HOME: "/tmp/h/.codex" },
  });
  assertEquals(env.HOME, "/tmp/h");
  assertEquals(env.CODEX_HOME, "/tmp/h/.codex");
  assertEquals(JSON.parse(env.CODEX_CONFIG), {
    model_reasoning_effort: "medium",
    model: "gpt-5.6-terra",
  });
});

Deno.test("claudeAgentEnv: maps each effort onto a thinking-token budget", () => {
  assertEquals(claudeAgentEnv("low").MAX_THINKING_TOKENS, "4000");
  assertEquals(claudeAgentEnv("medium").MAX_THINKING_TOKENS, "10000");
  assertEquals(claudeAgentEnv("high").MAX_THINKING_TOKENS, "31999");
  // Every effort the codex arm accepts must also resolve here, or the same
  // config value would pin one arm and be silently dropped by the other.
  for (const effort of ["low", "medium", "high", "xhigh"]) {
    assertEquals(typeof CLAUDE_THINKING_BUDGET[effort], "number");
  }
});

Deno.test("claudeAgentEnv: effort `none` disables thinking outright", () => {
  assertEquals(claudeAgentEnv("none").MAX_THINKING_TOKENS, "0");
});

Deno.test("claudeAgentEnv: an unknown effort throws and names the accepted values", () => {
  const err = assertThrows(() => claudeAgentEnv("turbo"), Error);
  const msg = (err as Error).message;
  assertEquals(msg.includes("turbo"), true, msg);
  assertEquals(msg.includes("medium"), true, msg);
});

Deno.test("agentLaunchEnv: a claude session carries MAX_THINKING_TOKENS on top of the adapter env", () => {
  const env = agentLaunchEnv({
    ide: "claude",
    model: "claude-haiku-4-5",
    effort: "medium",
    base: { HOME: "/tmp/h", CLAUDE_CONFIG_DIR: "/tmp/h/.claude" },
  });
  assertEquals(env.HOME, "/tmp/h");
  assertEquals(env.CLAUDE_CONFIG_DIR, "/tmp/h/.claude");
  assertEquals(env.MAX_THINKING_TOKENS, "10000");
  // The codex pin must not leak onto the claude arm.
  assertEquals(env.CODEX_CONFIG, undefined);
});

Deno.test("agentLaunchEnv: other IDEs get the adapter env untouched", () => {
  const env = agentLaunchEnv({
    ide: "cursor",
    model: "gemini-3-flash",
    effort: "medium",
    base: { HOME: "/tmp/h" },
  });
  assertEquals(env, { HOME: "/tmp/h" });
});
