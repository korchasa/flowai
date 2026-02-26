import { parse } from "@std/yaml";
import { join } from "@std/path";

const SKILLS_DIR = ".dev/skills";
let hasError = false;

console.log("Checking skill names...");

try {
  for await (const entry of Deno.readDir(SKILLS_DIR)) {
    if (entry.isDirectory) {
      const skillDirName = entry.name;
      const skillPath = join(SKILLS_DIR, skillDirName, "SKILL.md");

      try {
        const content = await Deno.readTextFile(skillPath);
        const match = content.match(/^---\n([\s\S]*?)\n---/);

        if (match) {
          const frontmatter = parse(match[1]) as Record<string, unknown>;
          const skillName = frontmatter.name;

          if (skillName !== skillDirName) {
            console.error(
              `❌ Error: Skill name '${skillName}' in '${skillPath}' does not match directory name '${skillDirName}'.`,
            );
            hasError = true;
          }
        } else {
          console.error(
            `❌ Error: Invalid or missing frontmatter in '${skillPath}'.`,
          );
          hasError = true;
        }
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          console.error(
            `❌ Error: Missing SKILL.md in '${
              join(SKILLS_DIR, skillDirName)
            }'.`,
          );
          hasError = true;
        } else {
          throw error;
        }
      }
    }
  }
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    console.warn(`Warning: Skills directory '${SKILLS_DIR}' not found.`);
  } else {
    console.error(`Error accessing skills directory:`, error);
    hasError = true;
  }
}

if (hasError) {
  Deno.exit(1);
} else {
  console.log("✅ All skill names match their directory names.");
}
