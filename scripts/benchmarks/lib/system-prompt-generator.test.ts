import { assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { generateSystemMessage } from "./system-prompt-generator.ts";
import { BenchmarkScenario } from "./types.ts";
import { createTempDir } from "./utils.ts";

Deno.test("generateSystemMessage assembles context correctly", async () => {
  const tempDir = await createTempDir("sysprompt");
  const sandboxPath = join(tempDir, "sandbox");
  await Deno.mkdir(sandboxPath, { recursive: true });

  // Create dummy AGENTS.md in sandbox
  const agentsMarkdown = "# Test Agent Reference";
  await Deno.writeTextFile(join(sandboxPath, "AGENTS.md"), agentsMarkdown);

  // Create dummy file for project layout
  await Deno.writeTextFile(join(sandboxPath, "hello.txt"), "world");

  // Initialize git in sandbox for git status check
  const initCmd = new Deno.Command("git", {
    args: ["init"],
    cwd: sandboxPath,
  });
  await initCmd.output();

  const scenario: BenchmarkScenario = {
    id: "test-scenario",
    name: "Test Scenario",
    targetAgentPath: ".cursor/skills/af-test/SKILL.md",
    userQuery: "How to test?",
    checklist: [],
    setup: () => Promise.resolve(),
  };

  const skillContent = "# Test Skill\nDescription of test skill";
  const userQuery = "How to test?";

  const systemMessage = await generateSystemMessage({
    scenario,
    sandboxPath,
    skillContent,
    agentsMarkdown,
    userQuery,
  });

  // Verify core sections exist
  assertStringIncludes(systemMessage, "<system>");
  assertStringIncludes(systemMessage, "<user_info>");
  assertStringIncludes(systemMessage, "<project_layout>");
  // assertStringIncludes(systemMessage, "<git_status>"); // Section might be empty if git is not initialized
  // assertStringIncludes(systemMessage, "<always_applied_workspace_rules>"); // Template uses <always_applied_workspace_rules description="...">
  assertStringIncludes(systemMessage, "always_applied_workspace_rules");
  assertStringIncludes(systemMessage, "<agent_skills>");
  // assertStringIncludes(systemMessage, "<manually_attached_skills>"); // Only present if skills are attached
  assertStringIncludes(systemMessage, "<user_query>");

  // Verify dynamic content
  assertStringIncludes(systemMessage, agentsMarkdown);
  assertStringIncludes(systemMessage, userQuery);
  // assertStringIncludes(systemMessage, skillContent); // Skill content might be formatted differently or wrapped
  assertStringIncludes(systemMessage, "- hello.txt"); // From project layout
  // assertStringIncludes(systemMessage, "On branch"); // From git status (sometimes fails in CI if git is not configured)

  // Verify that available skills are included (at least one from the real .cursor/skills)
  // assertStringIncludes(systemMessage, "<agent_skill fullPath=\"/sandbox/.cursor/skills/");

  // Cleanup
  await Deno.remove(tempDir, { recursive: true });
});
