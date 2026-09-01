import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { getIdeConfig, loadConfig } from "./llm.ts";
import { join } from "@std/path";

Deno.test("loadConfig - should load valid config", async () => {
  const tempConfig = join(Deno.cwd(), "benchmarks.config.json.test");
  const configData = {
    default_ides: ["claude"],
    ides: {
      cursor: {
        agent_models: ["gemini-3-flash"],
        default_agent_model: "gemini-3-flash",
        judge: { model: "google/gemini-2.5-flash", temperature: 0 },
      },
      claude: {
        agent_models: ["sonnet"],
        default_agent_model: "sonnet",
        judge: { model: "google/gemini-2.5-flash", temperature: 0 },
      },
    },
  };

  await Deno.writeTextFile(tempConfig, JSON.stringify(configData));

  try {
    const config = await loadConfig(tempConfig);

    assertEquals(config.default_ides, ["claude"]);

    const cursorConfig = getIdeConfig(config, "cursor");
    assertEquals(cursorConfig.default_agent_model, "gemini-3-flash");
    assertEquals(cursorConfig.judge.model, "google/gemini-2.5-flash");

    const claudeConfig = getIdeConfig(config, "claude");
    assertEquals(claudeConfig.default_agent_model, "sonnet");
    assertEquals(claudeConfig.judge.model, "google/gemini-2.5-flash");
  } finally {
    await Deno.remove(tempConfig);
  }
});

Deno.test("getIdeConfig - should throw for unknown IDE", () => {
  const config = {
    default_ides: ["cursor"],
    ides: {
      cursor: {
        agent_models: ["model"],
        default_agent_model: "model",
        judge: { model: "judge", temperature: 0 },
      },
    },
  };
  assertThrows(
    () => getIdeConfig(config, "unknown-ide"),
    Error,
    'No configuration found for IDE "unknown-ide"',
  );
});

Deno.test("loadConfig - should throw error if file not found (fail fast)", async () => {
  await assertRejects(
    () => loadConfig("non-existent.json"),
    Error,
    "Configuration file not found",
  );
});

Deno.test("acceptance-tests/config.json: every arm runs on codex — agent and judge alike", async () => {
  const config = await loadConfig("acceptance-tests/config.json");
  assertEquals(config.default_ides, ["codex"]);
  const codexModel = /^(gpt[-.]|o\d|codex)/i;
  for (const [ide, section] of Object.entries(config.ides)) {
    assertEquals(
      codexModel.test(section.judge.model),
      true,
      `${ide}: judge model "${section.judge.model}" is not a codex model`,
    );
    assertEquals(
      typeof section.judge.effort,
      "string",
      `${ide}: judge needs a pinned reasoning effort`,
    );
  }
  const codex = getIdeConfig(config, "codex");
  assertEquals(codexModel.test(codex.default_agent_model), true);
  assertEquals(typeof codex.agent_effort, "string");
});
