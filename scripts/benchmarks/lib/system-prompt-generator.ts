import { join } from "@std/path";
import { BenchmarkScenario } from "./types.ts";

export interface SystemMessageContext {
  scenario: BenchmarkScenario;
  sandboxPath: string;
  skillContent: string;
  agentsMarkdown: string;
}

/**
 * Generates a system message that mimics Cursor's real context assembly.
 */
export async function generateSystemMessage(
  ctx: SystemMessageContext,
): Promise<string> {
  const { scenario, sandboxPath, skillContent, agentsMarkdown } = ctx;

  // 1. Load Template
  const templatePath = join(
    Deno.cwd(),
    "scripts/benchmarks/lib/system-prompt.template.md",
  );
  let template = await Deno.readTextFile(templatePath);

  // 2. Project Layout Section
  let projectLayout = "No files found.";
  try {
    projectLayout = await generateFileTree(sandboxPath);
  } catch (e) {
    console.warn(`Warning: Failed to generate project layout: ${e}`);
  }

  // 3. Git Status Section
  let gitStatus = "Not a git repository or no changes.";
  try {
    const command = new Deno.Command("git", {
      args: ["status"],
      cwd: sandboxPath,
    });
    const { stdout, success } = await command.output();
    if (success) {
      gitStatus = new TextDecoder().decode(stdout).trim();
    }
  } catch (_) {
    // Ignore if git is not initialized
  }

  // 4. Assemble the final message
  const availableSkills = await generateSkillsSection(
    Deno.cwd(),
    scenario.targetAgentPath,
    skillContent,
  );

  template = template
    .replace("{{PROJECT_LAYOUT}}", projectLayout)
    .replace("{{GIT_STATUS}}", gitStatus)
    .replace("{{AGENTS}}", agentsMarkdown)
    .replace("{{AVAILABLE_SKILLS}}", availableSkills);

  return template.trim();
}

/**
 * Generates the <available_skills> section by scanning .cursor/skills
 */
async function generateSkillsSection(
  rootDir: string,
  targetSkillPath: string,
  targetSkillContent: string,
): Promise<string> {
  const skillsDir = join(rootDir, ".cursor/skills");
  let result = "";

  try {
    for await (const entry of Deno.readDir(skillsDir)) {
      if (!entry.isDirectory) continue;

      const skillFilePath = join(skillsDir, entry.name, "SKILL.md");
      try {
        const content = await Deno.readTextFile(skillFilePath);

        // Check for disable-model-invocation: true
        if (content.includes("disable-model-invocation: true")) {
          continue;
        }

        const relativePath = `.cursor/skills/${entry.name}/SKILL.md`;
        
        // Use provided content for the target skill (it might be modified for benchmark)
        const finalContent = relativePath === targetSkillPath ? targetSkillContent : content;

        result += `
<agent_skill fullPath="/sandbox/${relativePath}">
${finalContent}
</agent_skill>
`.trim() + "\n\n";
      } catch (_) {
        // Skip if SKILL.md doesn't exist in the folder
      }
    }
  } catch (e) {
    console.warn(`Warning: Failed to read skills directory: ${e}`);
  }

  return result.trim();
}

/**
 * Generates a simple file tree for the project layout.
 */
async function generateFileTree(
  dir: string,
  prefix = "  ",
): Promise<string> {
  let result = "";
  const entries = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.name === ".git") continue;
      entries.push(entry);
    }
  } catch (_) {
    return "";
  }

  // Sort entries: directories first, then files
  entries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    if (entry.isDirectory) {
      result += `${prefix}- ${entry.name}/\n`;
      result += await generateFileTree(join(dir, entry.name), prefix + "  ");
    } else {
      result += `${prefix}- ${entry.name}\n`;
    }
  }
  return result;
}
