// [FR-DIST.CODEX-AGENTS](../../documents/requirements.md#fr-dist.codex-agents-openai-codex-subagent-sync) — tests for mergeCodexConfig + buildCodexAgentSidecar
// [FR-DIST.CLEAN-PREFIX](../../documents/requirements.md#fr-dist.clean-prefix-prefix-based-orphan-cleanup) — ownership by `flowai-` key prefix (no manifest).
import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  buildCodexAgentSidecar,
  type CodexAgentChange,
  mergeCodexConfig,
} from "./toml_merge.ts";
import { parse as parseToml } from "@std/toml";

Deno.test("mergeCodexConfig - adds new [agents.<name>] table to empty config", () => {
  const changes: CodexAgentChange[] = [{
    name: "flowai-console-expert",
    description: "Console expert subagent",
    configFile: "./agents/flowai-console-expert.toml",
  }];
  const { content } = mergeCodexConfig("", changes);
  const parsed = parseToml(content) as Record<string, unknown>;
  const agents = parsed.agents as Record<string, unknown>;
  assert(agents, "agents table missing");
  const entry = agents["flowai-console-expert"] as Record<string, unknown>;
  assertEquals(entry.description, "Console expert subagent");
  assertEquals(entry.config_file, "./agents/flowai-console-expert.toml");
});

Deno.test("mergeCodexConfig - preserves existing top-level config keys", () => {
  const existing = `model = "gpt-5.4"
model_reasoning_effort = "high"

[projects."/Users/me/proj"]
trust_level = "trusted"
`;
  const changes: CodexAgentChange[] = [{
    name: "flowai-banana",
    description: "banana agent",
    configFile: "./agents/flowai-banana.toml",
  }];
  const { content } = mergeCodexConfig(existing, changes);
  const parsed = parseToml(content) as Record<string, unknown>;
  assertEquals(parsed.model, "gpt-5.4");
  assertEquals(parsed.model_reasoning_effort, "high");
  const projects = parsed.projects as Record<string, unknown>;
  assert(projects, "projects key should be preserved");
  const proj = projects["/Users/me/proj"] as Record<string, unknown>;
  assertEquals(proj.trust_level, "trusted");
});

Deno.test("mergeCodexConfig - removes stale flowai- tables by prefix", () => {
  // Pre-existing state: two flowai agents + one user-authored table.
  const existing = `[agents.flowai-alpha]
description = "alpha"
config_file = "./agents/flowai-alpha.toml"

[agents.flowai-beta]
description = "beta"
config_file = "./agents/flowai-beta.toml"

[agents.user-kept]
description = "user-authored, not managed by flowai"
config_file = "./agents/user-kept.toml"
`;
  // Current changes keep alpha, drop beta (simulating a rename / removal).
  const changes: CodexAgentChange[] = [
    {
      name: "flowai-alpha",
      description: "alpha",
      configFile: "./agents/flowai-alpha.toml",
    },
  ];
  const { content } = mergeCodexConfig(existing, changes);
  const parsed = parseToml(content) as Record<string, unknown>;
  const agents = parsed.agents as Record<string, unknown>;
  assert(agents["flowai-alpha"], "flowai-alpha should remain");
  assertEquals(
    agents["flowai-beta"],
    undefined,
    "flowai-beta should be removed by prefix rule",
  );
  assert(agents["user-kept"], "user-kept (no flowai- prefix) must survive");
});

Deno.test("mergeCodexConfig - preserves user-authored tables (no flowai- prefix)", () => {
  // Initial state: one flowai agent.
  const { content: afterFirstSync } = mergeCodexConfig(
    "",
    [{
      name: "flowai-console-expert",
      description: "Expert",
      configFile: "./agents/flowai-console-expert.toml",
    }],
  );
  // User adds their own agent by hand.
  const afterUserEdit = afterFirstSync + `
[agents.my-custom]
description = "my custom agent"
config_file = "./agents/my-custom.toml"
`;
  // Second sync: same flowai agent — user table must survive.
  const { content: afterSecondSync } = mergeCodexConfig(
    afterUserEdit,
    [{
      name: "flowai-console-expert",
      description: "Expert",
      configFile: "./agents/flowai-console-expert.toml",
    }],
  );
  const parsed = parseToml(afterSecondSync) as Record<string, unknown>;
  const agents = parsed.agents as Record<string, unknown>;
  assert(agents["flowai-console-expert"], "flowai agent preserved");
  assert(agents["my-custom"], "user agent must survive");
  const userEntry = agents["my-custom"] as Record<string, unknown>;
  assertEquals(userEntry.description, "my custom agent");
});

Deno.test("mergeCodexConfig - malformed input TOML throws with file context in message", () => {
  const malformed = `model = "gpt-5.4"
[agents.broken
description = "missing close bracket"
`;
  assertThrows(
    () =>
      mergeCodexConfig(malformed, [{
        name: "flowai-x",
        description: "x",
        configFile: "./x.toml",
      }]),
    Error,
    "Failed to parse",
  );
});

Deno.test("mergeCodexConfig - idempotent: same changes twice produce same content", () => {
  const changes: CodexAgentChange[] = [
    {
      name: "flowai-a",
      description: "a-desc",
      configFile: "./agents/flowai-a.toml",
    },
    {
      name: "flowai-b",
      description: "b-desc",
      configFile: "./agents/flowai-b.toml",
    },
  ];
  const first = mergeCodexConfig("", changes);
  const second = mergeCodexConfig(first.content, changes);
  assertEquals(first.content, second.content);
});

Deno.test("buildCodexAgentSidecar - extracts name/description + embeds body in triple-quoted literal", () => {
  const raw = `---
name: flowai-console-expert
description: Shell expert that runs commands without editing code
---

You are a console specialist. Run commands and report results.
Do not modify files.
`;
  const { sidecar, change } = buildCodexAgentSidecar(raw);
  const parsed = parseToml(sidecar) as Record<string, unknown>;
  assertEquals(parsed.name, "flowai-console-expert");
  assertEquals(
    parsed.description,
    "Shell expert that runs commands without editing code",
  );
  const instructions = parsed.developer_instructions as string;
  assert(
    instructions.includes("You are a console specialist."),
    "body preserved",
  );
  assert(
    instructions.includes("Do not modify files."),
    "multi-line body preserved",
  );
  assertEquals(change.name, "flowai-console-expert");
  assertEquals(change.configFile, "./agents/flowai-console-expert.toml");
});

Deno.test("buildCodexAgentSidecar - body with triple-single-quotes falls back to triple-double", () => {
  const raw = `---
name: flowai-edge
description: Body has triple quotes
---

Here's a literal: ''' (three singles).
`;
  const { sidecar } = buildCodexAgentSidecar(raw);
  const parsed = parseToml(sidecar) as Record<string, unknown>;
  const instructions = parsed.developer_instructions as string;
  assert(
    instructions.includes("(three singles)"),
    `body content lost: ${instructions}`,
  );
});

Deno.test("buildCodexAgentSidecar - body with double-quotes preserved in literal form", () => {
  const raw = `---
name: flowai-quoter
description: Body with double quotes
---

Say "hello world" and also \`code\`.
`;
  const { sidecar } = buildCodexAgentSidecar(raw);
  const parsed = parseToml(sidecar) as Record<string, unknown>;
  const instructions = parsed.developer_instructions as string;
  assertEquals(
    instructions.includes('Say "hello world"'),
    true,
  );
});

Deno.test("buildCodexAgentSidecar - throws on missing frontmatter", () => {
  assertThrows(
    () => buildCodexAgentSidecar("just body without frontmatter"),
    Error,
    "missing YAML frontmatter",
  );
});

Deno.test("buildCodexAgentSidecar - throws on missing name", () => {
  const raw = `---
description: only description
---

Body.
`;
  assertThrows(
    () => buildCodexAgentSidecar(raw),
    Error,
    "missing required field `name`",
  );
});

Deno.test("mergeCodexConfig - empty changes leaves user content unchanged", () => {
  const existing = `model = "gpt-5.4"

[features]
multi_agent = true
`;
  const { content } = mergeCodexConfig(existing, []);
  // Normalise whitespace: @std/toml may re-stringify with minor formatting diffs.
  const parsedOriginal = parseToml(existing);
  const parsedResult = parseToml(content);
  assertEquals(parsedResult, parsedOriginal);
});
