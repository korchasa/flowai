/**
 * Checks that flowai-review-and-commit contains the step_by_step sections
 * from both flowai-review and flowai-commit skills.
 *
 * flowai-review-and-commit inlines both workflows to avoid fragile
 * "skill calls skill" delegation. This script ensures the inlined
 * content stays in sync with the source skills.
 */

/** Find skill directory by scanning pack structure */
async function findSkillDir(skillName: string): Promise<string> {
  for await (const pack of Deno.readDir("framework")) {
    if (!pack.isDirectory) continue;
    const skillPath = `framework/${pack.name}/skills/${skillName}`;
    try {
      const stat = await Deno.stat(skillPath);
      if (stat.isDirectory) return skillPath;
    } catch { /* not in this pack */ }
  }
  throw new Error(`Skill '${skillName}' not found in any pack`);
}

const SOURCES = [
  { skill: "flowai-review", phase: "Review Phase" },
  { skill: "flowai-commit", phase: "Commit Phase" },
] as const;

const COMPOSITE = "flowai-review-and-commit";

function extractStepByStep(content: string): string | null {
  const match = content.match(
    /<step_by_step>\s*([\s\S]*?)\s*<\/step_by_step>/,
  );
  return match ? match[1].trim() : null;
}

let hasError = false;

console.log("Checking skill sync: flowai-review-and-commit...");

const compositeDir = await findSkillDir(COMPOSITE);
const compositePath = `${compositeDir}/SKILL.md`;
const compositeContent = await Deno.readTextFile(compositePath);

for (const { skill, phase } of SOURCES) {
  const sourceDir = await findSkillDir(skill);
  const sourcePath = `${sourceDir}/SKILL.md`;
  const sourceContent = await Deno.readTextFile(sourcePath);
  const sourceSteps = extractStepByStep(sourceContent);

  if (!sourceSteps) {
    console.error(
      `\n❌ ${sourcePath}: missing <step_by_step> section.\n` +
        `   Every skill must have a <step_by_step> block with instructions.`,
    );
    hasError = true;
    continue;
  }

  if (!compositeContent.includes(sourceSteps)) {
    console.error(
      `\n❌ ${COMPOSITE} is out of sync with ${skill}.\n` +
        `   The <step_by_step> content from ${sourcePath}\n` +
        `   must appear verbatim inside ${compositePath} (${phase}).\n` +
        `\n` +
        `   WHY: ${COMPOSITE} inlines both workflows to avoid fragile\n` +
        `   cross-skill delegation. When you change ${skill},\n` +
        `   copy the updated <step_by_step> into the ${phase}\n` +
        `   of ${compositePath}.`,
    );
    hasError = true;
  }
}

if (hasError) {
  Deno.exit(1);
} else {
  console.log(
    "✅ flowai-review-and-commit is in sync with flowai-review and flowai-commit.",
  );
}
