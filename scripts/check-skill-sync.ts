/**
 * Checks that flow-review-and-commit contains the step_by_step sections
 * from both flow-review and flow-commit skills.
 *
 * flow-review-and-commit inlines both workflows to avoid fragile
 * "skill calls skill" delegation. This script ensures the inlined
 * content stays in sync with the source skills.
 */

const FRAMEWORK_DIR = "framework/skills";

const SOURCES = [
  { skill: "flow-review", phase: "Review Phase" },
  { skill: "flow-commit", phase: "Commit Phase" },
] as const;

const COMPOSITE = "flow-review-and-commit";

function extractStepByStep(content: string): string | null {
  const match = content.match(
    /<step_by_step>\s*([\s\S]*?)\s*<\/step_by_step>/,
  );
  return match ? match[1].trim() : null;
}

let hasError = false;

console.log("Checking skill sync: flow-review-and-commit...");

const compositePath = `${FRAMEWORK_DIR}/${COMPOSITE}/SKILL.md`;
const compositeContent = await Deno.readTextFile(compositePath);

for (const { skill, phase } of SOURCES) {
  const sourcePath = `${FRAMEWORK_DIR}/${skill}/SKILL.md`;
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
    "✅ flow-review-and-commit is in sync with flow-review and flow-commit.",
  );
}
