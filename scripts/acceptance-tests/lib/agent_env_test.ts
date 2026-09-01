import { assertEquals } from "@std/assert";
import { agentLaunchEnv, codexAgentEnv } from "./agent_env.ts";

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

Deno.test("agentLaunchEnv: other IDEs get the adapter env untouched", () => {
  const env = agentLaunchEnv({
    ide: "cursor",
    model: "gemini-3-flash",
    effort: "medium",
    base: { HOME: "/tmp/h" },
  });
  assertEquals(env, { HOME: "/tmp/h" });
});
