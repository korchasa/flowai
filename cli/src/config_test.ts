import { assertEquals } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import {
  loadConfig,
  migrateV1ToV1_1,
  parseConfigData,
  saveConfig,
} from "./config.ts";
import { generateConfigNonInteractive } from "./config_generator.ts";
import { InMemoryFrameworkSource } from "./source.ts";
import { PACKS_VERSION } from "./types.ts";

Deno.test("loadConfig - returns null when no .flowai.yaml", async () => {
  const fs = new InMemoryFsAdapter();
  const config = await loadConfig("/project", fs);
  assertEquals(config, null);
});

Deno.test("loadConfig - parses valid .flowai.yaml", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile(
    "/project/.flowai.yaml",
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
    "/project/.flowai.yaml",
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
      "Invalid .flowai.yaml: skills.include and skills.exclude are mutually exclusive",
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
      "Invalid .flowai.yaml: agents.include and agents.exclude are mutually exclusive",
    );
  }
});

Deno.test("parseConfigData - parses commands section", () => {
  const config = parseConfigData({
    commands: { include: ["my-cmd"], exclude: [] },
  });
  assertEquals(config.commands.include, ["my-cmd"]);
  assertEquals(config.commands.exclude, []);
});

Deno.test("parseConfigData - defaults commands to empty include/exclude", () => {
  const config = parseConfigData({});
  assertEquals(config.commands.include, []);
  assertEquals(config.commands.exclude, []);
});

Deno.test("parseConfigData - throws on commands include+exclude conflict", () => {
  try {
    parseConfigData({
      commands: { include: ["a"], exclude: ["b"] },
    });
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(
      (e as Error).message,
      "Invalid .flowai.yaml: commands.include and commands.exclude are mutually exclusive",
    );
  }
});

Deno.test("saveConfig - writes valid YAML with commands section", async () => {
  const fs = new InMemoryFsAdapter();
  await saveConfig("/project", {
    version: "1.0",
    ides: ["cursor"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
  }, fs);

  const content = await fs.readFile("/project/.flowai.yaml");
  assertEquals(content.includes("cursor"), true);
  assertEquals(content.includes("commands:"), true);
  assertEquals(content.includes("source:"), false);
  assertEquals(content.includes("ref:"), false);
});

Deno.test("saveConfig - writes valid YAML without source/ref", async () => {
  const fs = new InMemoryFsAdapter();
  await saveConfig("/project", {
    version: "1.0",
    ides: ["cursor"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
  }, fs);

  const content = await fs.readFile("/project/.flowai.yaml");
  assertEquals(content.includes("cursor"), true);
  assertEquals(content.includes("source:"), false);
  assertEquals(content.includes("ref:"), false);
});

// --- Packs tests ---

Deno.test("parseConfigData - parses packs list", () => {
  const config = parseConfigData({
    version: "1.1",
    ides: ["claude"],
    packs: ["core", "engineering"],
  });
  assertEquals(config.version, "1.1");
  assertEquals(config.packs, ["core", "engineering"]);
});

Deno.test("parseConfigData - packs undefined for v1 config", () => {
  const config = parseConfigData({
    version: "1.0",
    ides: ["claude"],
  });
  assertEquals(config.packs, undefined);
});

Deno.test("parseConfigData - packs empty array means core only", () => {
  const config = parseConfigData({
    version: "1.1",
    packs: [],
  });
  assertEquals(config.packs, []);
});

Deno.test("migrateV1ToV1_1 - adds all packs to v1 config", () => {
  const v1Config = parseConfigData({
    version: "1.0",
    ides: ["claude"],
  });
  const migrated = migrateV1ToV1_1(v1Config, ["core", "engineering", "deno"]);
  assertEquals(migrated.version, "1.1");
  assertEquals(migrated.packs, ["core", "engineering", "deno"]);
  assertEquals(migrated.ides, ["claude"]);
});

Deno.test("migrateV1ToV1_1 - no-op if already v1.1", () => {
  const v1_1Config = parseConfigData({
    version: "1.1",
    packs: ["core"],
  });
  const result = migrateV1ToV1_1(v1_1Config, ["core", "engineering"]);
  assertEquals(result.packs, ["core"]); // unchanged
});

Deno.test("saveConfig - writes packs section for v1.1", async () => {
  const fs = new InMemoryFsAdapter();
  await saveConfig("/project", {
    version: "1.1",
    ides: ["claude"],
    packs: ["core", "engineering"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
  }, fs);

  const content = await fs.readFile("/project/.flowai.yaml");
  assertEquals(content.includes("packs:"), true);
  assertEquals(content.includes("core"), true);
  assertEquals(content.includes("engineering"), true);
});

Deno.test("saveConfig - omits packs for v1 config", async () => {
  const fs = new InMemoryFsAdapter();
  await saveConfig("/project", {
    version: "1.0",
    ides: ["claude"],
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
  }, fs);

  const content = await fs.readFile("/project/.flowai.yaml");
  assertEquals(content.includes("packs:"), false);
});

Deno.test("loadConfig - parses v1.1 with packs", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile(
    "/project/.flowai.yaml",
    `version: "1.1"
ides:
  - claude
packs:
  - core
  - deno
skills:
  include: []
  exclude: []
agents:
  include: []
  exclude: []
`,
  );

  const config = await loadConfig("/project", fs);
  assertEquals(config!.version, "1.1");
  assertEquals(config!.packs, ["core", "deno"]);
});

// --- Non-interactive config generation tests ---

Deno.test("generateConfigNonInteractive - uses auto-detected IDEs", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.mkdir("/project/.claude");
  await fs.mkdir("/project/.cursor");

  const source = new InMemoryFrameworkSource(
    new Map([
      [
        "framework/core/pack.yaml",
        "name: core\nversion: 1.0\ndescription: Core",
      ],
    ]),
  );

  const config = await generateConfigNonInteractive("/project", fs, source);
  assertEquals(config.ides, ["cursor", "claude"]);
});

Deno.test("generateConfigNonInteractive - selects all available packs", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.mkdir("/project/.claude");

  const source = new InMemoryFrameworkSource(
    new Map([
      [
        "framework/core/pack.yaml",
        "name: core\nversion: 1.0\ndescription: Core",
      ],
      [
        "framework/deno/pack.yaml",
        "name: deno\nversion: 1.0\ndescription: Deno",
      ],
      [
        "framework/engineering/pack.yaml",
        "name: engineering\nversion: 1.0\ndescription: Eng",
      ],
    ]),
  );

  const config = await generateConfigNonInteractive("/project", fs, source);
  assertEquals(config.version, PACKS_VERSION);
  assertEquals(config.packs, ["core", "deno", "engineering"]);
});

Deno.test("generateConfigNonInteractive - saves .flowai.yaml", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.mkdir("/project/.claude");

  const source = new InMemoryFrameworkSource(
    new Map([
      [
        "framework/core/pack.yaml",
        "name: core\nversion: 1.0\ndescription: Core",
      ],
    ]),
  );

  await generateConfigNonInteractive("/project", fs, source);

  const saved = await loadConfig("/project", fs);
  assertEquals(saved !== null, true);
  assertEquals(saved!.ides, ["claude"]);
  assertEquals(saved!.packs, ["core"]);
});

Deno.test("generateConfigNonInteractive - empty filters by default", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.mkdir("/project/.opencode");

  const source = new InMemoryFrameworkSource(
    new Map([
      [
        "framework/core/pack.yaml",
        "name: core\nversion: 1.0\ndescription: Core",
      ],
    ]),
  );

  const config = await generateConfigNonInteractive("/project", fs, source);
  assertEquals(config.skills, { include: [], exclude: [] });
  assertEquals(config.agents, { include: [], exclude: [] });
  assertEquals(config.commands, { include: [], exclude: [] });
});
