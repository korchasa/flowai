// FR-DIST.CODEX-AGENTS — tests for mergeCodexConfig + buildCodexAgentSidecar
import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  buildCodexAgentSidecar,
  type CodexAgentChange,
  type CodexManifest,
  emptyCodexManifest,
  mergeCodexConfig,
} from "./toml_merge.ts";
import { parse as parseToml } from "@std/toml";

const EMPTY_MANIFEST: CodexManifest = emptyCodexManifest();

Deno.test("mergeCodexConfig - adds new [agents.<name>] table to empty config", () => {
  const changes: CodexAgentChange[] = [{
    name: "flowai-console-expert",
    description: "Console expert subagent",
    configFile: "./agents/flowai-console-expert.toml",
  }];
  const { content, manifest } = mergeCodexConfig(
    "",
    changes,
    EMPTY_MANIFEST,
  );
  const parsed = parseToml(content) as Record<string, unknown>;
  const agents = parsed.agents as Record<string, unknown>;
  assert(agents, "agents table missing");
  const entry = agents["flowai-console-expert"] as Record<string, unknown>;
  assertEquals(entry.description, "Console expert subagent");
  assertEquals(entry.config_file, "./agents/flowai-console-expert.toml");
  assertEquals(manifest.agents.includes("flowai-console-expert"), true);
});

Deno.test("mergeCodexConfig - preserves existing top-level config keys", () => {
  const existing = `model = "gpt-5.4"
model_reasoning_effort = "high"

[projects."/Users/me/proj"]
trust_level = "trusted"
`;
  const changes: CodexAgentChange[] = [{
    name: "banana",
    description: "banana agent",
    configFile: "./agents/banana.toml",
  }];
  const { content } = mergeCodexConfig(existing, changes, EMPTY_MANIFEST);
  const parsed = parseToml(content) as Record<string, unknown>;
  assertEquals(parsed.model, "gpt-5.4");
  assertEquals(parsed.model_reasoning_effort, "high");
  const projects = parsed.projects as Record<string, unknown>;
  assert(projects, "projects key should be preserved");
  const proj = projects["/Users/me/proj"] as Record<string, unknown>;
  assertEquals(proj.trust_level, "trusted");
});

Deno.test("mergeCodexConfig - removes stale agents listed in manifest but not in changes", () => {
  const existing = `[agents.alpha]
description = "alpha"
config_file = "./agents/alpha.toml"

[agents.beta]
description = "beta"
config_file = "./agents/beta.toml"

[agents.user-kept]
description = "user-authored, not managed"
config_file = "./agents/user-kept.toml"
`;
  const manifest: CodexManifest = {
    version: 1,
    agents: ["alpha", "beta"],
  };
  const changes: CodexAgentChange[] = [
    {
      name: "alpha",
      description: "alpha",
      configFile: "./agents/alpha.toml",
    },
    // beta dropped
  ];
  const { content, manifest: newManifest } = mergeCodexConfig(
    existing,
    changes,
    manifest,
  );
  const parsed = parseToml(content) as Record<string, unknown>;
  const agents = parsed.agents as Record<string, unknown>;
  assert(agents.alpha, "alpha should remain");
  assertEquals(agents.beta, undefined, "beta should be removed");
  assert(agents["user-kept"], "user-kept should NOT be removed");
  assertEquals(newManifest.agents, ["alpha"]);
});

Deno.test("mergeCodexConfig - user-hand-edited agent table survives round-trip", () => {
  // Initial state: one flowai agent.
  const { content: afterFirstSync } = mergeCodexConfig(
    "",
    [{
      name: "flowai-console-expert",
      description: "Expert",
      configFile: "./agents/flowai-console-expert.toml",
    }],
    EMPTY_MANIFEST,
  );
  // User adds their own agent by hand.
  const afterUserEdit = afterFirstSync + `
[agents.my-custom]
description = "my custom agent"
config_file = "./agents/my-custom.toml"
`;
  // Second sync: same flowai agent, user agent absent from changes.
  const { content: afterSecondSync } = mergeCodexConfig(
    afterUserEdit,
    [{
      name: "flowai-console-expert",
      description: "Expert",
      configFile: "./agents/flowai-console-expert.toml",
    }],
    { version: 1, agents: ["flowai-console-expert"] },
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
        name: "x",
        description: "x",
        configFile: "./x.toml",
      }], EMPTY_MANIFEST),
    Error,
    "Failed to parse",
  );
});

Deno.test("mergeCodexConfig - idempotent: same changes twice produce same content", () => {
  const changes: CodexAgentChange[] = [
    {
      name: "a",
      description: "a-desc",
      configFile: "./agents/a.toml",
    },
    {
      name: "b",
      description: "b-desc",
      configFile: "./agents/b.toml",
    },
  ];
  const first = mergeCodexConfig("", changes, EMPTY_MANIFEST);
  const second = mergeCodexConfig(first.content, changes, first.manifest);
  assertEquals(first.content, second.content);
  assertEquals(first.manifest.agents.sort(), second.manifest.agents.sort());
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
name: edge
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
name: quoter
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

Deno.test("mergeCodexConfig - empty changes + empty manifest leaves content unchanged", () => {
  const existing = `model = "gpt-5.4"

[features]
multi_agent = true
`;
  const { content } = mergeCodexConfig(
    existing,
    [],
    EMPTY_MANIFEST,
  );
  // Normalise whitespace: @std/toml may re-stringify with minor formatting diffs.
  const parsedOriginal = parseToml(existing);
  const parsedResult = parseToml(content);
  assertEquals(parsedResult, parsedOriginal);
});
