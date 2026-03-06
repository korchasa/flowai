#!/usr/bin/env -S deno run -A
/**
 * Skill Initializer - Creates a new skill from template
 *
 * Usage:
 *     deno run -A init_skill.ts <skill-name> --path <path>
 *
 * Examples:
 *     deno run -A init_skill.ts my-review-skill --path .cursor/skills
 *     deno run -A init_skill.ts code-analyzer --path ~/.cursor/skills
 */

import { join, resolve } from "jsr:@std/path";

const SKILL_TEMPLATE = `---
name: {skill_name}
description: [TODO: Complete and informative explanation of what the skill does and when to use it. Include WHEN to use this skill - specific scenarios, file types, or tasks that trigger it.]
---

# {skill_title}

## Overview

[TODO: 1-2 sentences explaining what this skill enables]

## Instructions

[TODO: Clear, step-by-step guidance for the agent. Choose structure that fits:

**1. Workflow-Based** (sequential processes)
- Structure: ## Overview -> ## Step 1 -> ## Step 2...

**2. Task-Based** (tool collections)
- Structure: ## Overview -> ## Task Category 1 -> ## Task Category 2...

**3. Reference/Guidelines** (standards or specifications)
- Structure: ## Overview -> ## Guidelines -> ## Specifications...

Delete this guidance section when done.]

## Resources

This skill includes example resource directories:

### scripts/
Executable code for automation. Customize or delete \`scripts/example.py\`.

### references/
Documentation loaded into context as needed. Customize or delete \`references/reference.md\`.

### assets/
Files used in output (templates, images, fonts). Customize or delete \`assets/example_asset.txt\`.

**Delete unneeded directories.** Not every skill requires all three.
`;

const EXAMPLE_SCRIPT = `#!/usr/bin/env python3
"""
Example helper script for {skill_name}

Replace with actual implementation or delete if not needed.
"""

def main():
    print("This is an example script for {skill_name}")
    # TODO: Add actual script logic here

if __name__ == "__main__":
    main()
`;

const EXAMPLE_REFERENCE = `# Reference Documentation for {skill_title}

Replace with actual reference content or delete if not needed.

## When Reference Docs Are Useful

- Comprehensive API documentation
- Detailed workflow guides
- Complex multi-step processes
- Information too lengthy for main SKILL.md
- Content only needed for specific use cases
`;

const EXAMPLE_ASSET = `# Example Asset File

Replace with actual asset files (templates, images, fonts, etc.) or delete if not needed.

Asset files are NOT loaded into context — they are used within the output the agent produces.
`;

export function titleCaseName(name: string): string {
  return name.split("-").map((word) =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(" ");
}

function templateReplace(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

export async function initSkill(
  skillName: string,
  path: string,
): Promise<string | null> {
  const skillDir = resolve(join(path, skillName));

  try {
    const stat = await Deno.stat(skillDir);
    if (stat) {
      console.log(`Error: Skill directory already exists: ${skillDir}`);
      return null;
    }
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      console.log(`Error creating directory: ${e}`);
      return null;
    }
    // NotFound is expected — directory doesn't exist yet
  }

  try {
    await Deno.mkdir(skillDir, { recursive: true });
    console.log(`Created skill directory: ${skillDir}`);
  } catch (e) {
    console.log(`Error creating directory: ${e}`);
    return null;
  }

  // Create SKILL.md
  const skillTitle = titleCaseName(skillName);
  const content = templateReplace(SKILL_TEMPLATE, {
    skill_name: skillName,
    skill_title: skillTitle,
  });

  try {
    await Deno.writeTextFile(join(skillDir, "SKILL.md"), content);
    console.log("Created SKILL.md");
  } catch (e) {
    console.log(`Error creating SKILL.md: ${e}`);
    return null;
  }

  // Create resource directories with examples
  try {
    const scriptsDir = join(skillDir, "scripts");
    await Deno.mkdir(scriptsDir, { recursive: true });
    const exampleScriptPath = join(scriptsDir, "example.py");
    await Deno.writeTextFile(
      exampleScriptPath,
      templateReplace(EXAMPLE_SCRIPT, { skill_name: skillName }),
    );
    await Deno.chmod(exampleScriptPath, 0o755);
    console.log("Created scripts/example.py");

    const referencesDir = join(skillDir, "references");
    await Deno.mkdir(referencesDir, { recursive: true });
    await Deno.writeTextFile(
      join(referencesDir, "reference.md"),
      templateReplace(EXAMPLE_REFERENCE, { skill_title: skillTitle }),
    );
    console.log("Created references/reference.md");

    const assetsDir = join(skillDir, "assets");
    await Deno.mkdir(assetsDir, { recursive: true });
    await Deno.writeTextFile(
      join(assetsDir, "example_asset.txt"),
      EXAMPLE_ASSET,
    );
    console.log("Created assets/example_asset.txt");
  } catch (e) {
    console.log(`Error creating resource directories: ${e}`);
    return null;
  }

  console.log(`\nSkill '${skillName}' initialized at ${skillDir}`);
  console.log("\nNext steps:");
  console.log("1. Edit SKILL.md — complete TODO items, update description");
  console.log(
    "2. Customize or delete example files in scripts/, references/, assets/",
  );
  console.log("3. Run validate_skill.py to check structure");

  return skillDir;
}

async function main(): Promise<void> {
  const args = Deno.args;

  if (args.length < 3 || args[1] !== "--path") {
    console.log("Usage: init_skill.py <skill-name> --path <path>");
    console.log("\nSkill name requirements:");
    console.log("  - Hyphen-case (e.g., 'code-review')");
    console.log("  - Lowercase letters, digits, hyphens only");
    console.log("  - Max 64 characters");
    console.log("\nExamples:");
    console.log("  init_skill.py code-review --path .cursor/skills");
    console.log("  init_skill.py pr-analyzer --path ~/.cursor/skills");
    Deno.exit(1);
  }

  const skillName = args[0];
  const path = args[2];

  console.log(`Initializing skill: ${skillName}`);
  console.log(`   Location: ${path}\n`);

  const result = await initSkill(skillName, path);
  Deno.exit(result ? 0 : 1);
}

if (import.meta.main) {
  main();
}
