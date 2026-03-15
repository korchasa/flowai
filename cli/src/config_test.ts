import { assertEquals } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import { loadConfig, parseConfigData, saveConfig } from "./config.ts";

Deno.test("loadConfig - returns null when no .flow.yaml", async () => {
  const fs = new InMemoryFsAdapter();
  const config = await loadConfig("/project", fs);
  assertEquals(config, null);
});

Deno.test("loadConfig - parses valid .flow.yaml", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile(
    "/project/.flow.yaml",
    `version: "1.0"
ides:
  - cursor
  - claude
skills:
  include: []
  exclude: []
agents:
  include: []
  exclude: []
`,
  );

  const config = await loadConfig("/project", fs);
  assertEquals(config!.version, "1.0");
  assertEquals(config!.ides, ["cursor", "claude"]);
});

Deno.test("loadConfig - ignores unknown fields (backward compat)", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile(
    "/project/.flow.yaml",
    `version: "1.0"
source: korchasa/flow
ref: main
ides:
  - claude
skills:
  include: []
  exclude: []
agents:
  include: []
  exclude: []
`,
  );

  const config = await loadConfig("/project", fs);
  assertEquals(config!.version, "1.0");
  assertEquals(config!.ides, ["claude"]);
});

Deno.test("parseConfigData - applies defaults", () => {
  const config = parseConfigData({});
  assertEquals(config.version, "1.0");
  assertEquals(config.ides, []);
});

Deno.test("parseConfigData - throws on include+exclude conflict", () => {
  try {
    parseConfigData({
      skills: { include: ["a"], exclude: ["b"] },
    });
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(
      (e as Error).message,
      "Invalid .flow.yaml: skills.include and skills.exclude are mutually exclusive",
    );
  }
});

Deno.test("parseConfigData - throws on agents include+exclude conflict", () => {
  try {
    parseConfigData({
      agents: { include: ["a"], exclude: ["b"] },
    });
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(
      (e as Error).message,
      "Invalid .flow.yaml: agents.include and agents.exclude are mutually exclusive",
    );
  }
});

Deno.test("saveConfig - writes valid YAML without source/ref", async () => {
  const fs = new InMemoryFsAdapter();
  await saveConfig("/project", {
    version: "1.0",
    ides: ["cursor"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
  }, fs);

  const content = await fs.readFile("/project/.flow.yaml");
  assertEquals(content.includes("cursor"), true);
  assertEquals(content.includes("source:"), false);
  assertEquals(content.includes("ref:"), false);
});
