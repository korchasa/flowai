import { assertEquals, assertRejects } from "@std/assert";
import { loadConfig } from "./llm.ts";
import { join } from "@std/path";

Deno.test("loadConfig - should load valid config", async () => {
  const tempConfig = join(Deno.cwd(), "benchmarks.config.json.test");
  const configData = {
    presets: {
      test: { model: "test-model", temperature: 0.5 },
      test_judge: { model: "judge-model" },
    },
    default_agent_model: "test",
    default_judge_preset: "test_judge",
  };

  await Deno.writeTextFile(tempConfig, JSON.stringify(configData));

  try {
    const config = await loadConfig(tempConfig);
    assertEquals(config.presets.test.model, "test-model");
    assertEquals(config.presets.test_judge.model, "judge-model");
    assertEquals(config.default_agent_model, "test");
  } finally {
    await Deno.remove(tempConfig);
  }
});

Deno.test("loadConfig - should throw error if file not found (fail fast)", async () => {
  await assertRejects(
    () => loadConfig("non-existent.json"),
    Error,
    "Configuration file not found",
  );
});
