/**
 * Checks that flowai-review-and-commit contains the step_by_step sections
 * from both flowai-skill-review and flowai-commit skills.
 *
 * flowai-review-and-commit inlines both workflows to avoid fragile
 * "skill calls skill" delegation. This script ensures the inlined
 * content stays in sync with the source skills.
 */

/** Find primitive directory by scanning pack structure. Accepts both
 * `framework/<pack>/skills/<name>/` and `framework/<pack>/commands/<name>/`
 * since flowai-review-and-commit inlines primitives from the commands tree. */
async function findSkillDir(skillName: string): Promise<string> {
  for await (const pack of Deno.readDir("framework")) {
    if (!pack.isDirectory) continue;
    for (const kind of ["commands", "skills"]) {
      const path = `framework/${pack.name}/${kind}/${skillName}`;
      try {
        const stat = await Deno.stat(path);
        if (stat.isDirectory) return path;
      } catch { /* not in this location */ }
    }
  }
  throw new Error(
    `Primitive '${skillName}' not found in any pack (checked commands/ and skills/)`,
  );
}

/** Sync-check pairs: each composite inlines step_by_step from its sources.
 *  `allowedDivergentSteps` lists step numbers (1-based) that MAY differ
 *  between source and composite — the composite has its own version of
 *  those steps (e.g., Phase 2 step 1 skips diff re-reading). */
const SYNC_CHECKS: Array<{
  composite: string;
  sources: Array<{
    skill: string;
    phase: string;
    allowedDivergentSteps?: number[];
  }>;
}> = [
  {
    composite: "flowai-review-and-commit",
    sources: [
      { skill: "flowai-skill-review", phase: "Review Phase" },
      { skill: "flowai-commit", phase: "Commit Phase" },
    ],
  },
  {
    composite: "flowai-review-and-commit-beta",
    sources: [
      { skill: "flowai-skill-review", phase: "Review Phase" },
      {
        skill: "flowai-commit-beta",
        phase: "Commit Phase",
        allowedDivergentSteps: [1],
      },
    ],
  },
  {
    composite: "flowai-do-with-plan",
    sources: [
      {
        skill: "flowai-plan-exp-permanent-tasks",
        phase: "Plan Phase",
        allowedDivergentSteps: [8],
      },
      {
        skill: "flowai-skill-review",
        phase: "Review-and-Commit Phase (review)",
      },
      {
        skill: "flowai-commit-beta",
        phase: "Review-and-Commit Phase (commit)",
        allowedDivergentSteps: [1],
      },
    ],
  },
];

function extractStepByStep(content: string): string | null {
  const match = content.match(
    /<step_by_step>\s*([\s\S]*?)\s*<\/step_by_step>/,
  );
  return match ? match[1].trim() : null;
}

/** Split step_by_step text into individual steps by numbered headings.
 *  Returns array of { num, text } where text includes everything from
 *  the step heading to the next step heading (or end). */
function splitSteps(
  stepByStep: string,
): Array<{ num: number; text: string }> {
  const steps: Array<{ num: number; text: string }> = [];
  const regex = /^(\d+)\.\s+\*\*/gm;
  const matches: Array<{ index: number; num: number }> = [];
  let m;
  while ((m = regex.exec(stepByStep)) !== null) {
    matches.push({ index: m.index, num: parseInt(m[1]) });
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : undefined;
    steps.push({
      num: matches[i].num,
      text: stepByStep.slice(start, end).trim(),
    });
  }
  return steps;
}

let hasError = false;

for (const { composite, sources } of SYNC_CHECKS) {
  let compositeDir: string;
  try {
    compositeDir = await findSkillDir(composite);
  } catch {
    // Composite not found — skip (e.g., beta not yet created)
    continue;
  }

  console.log(`Checking skill sync: ${composite}...`);
  const compositePath = `${compositeDir}/SKILL.md`;
  const compositeContent = await Deno.readTextFile(compositePath);

  for (const { skill, phase, allowedDivergentSteps } of sources) {
    let sourceDir: string;
    try {
      sourceDir = await findSkillDir(skill);
    } catch {
      // Source not found — skip (e.g., beta not yet created)
      continue;
    }

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

    if (!allowedDivergentSteps || allowedDivergentSteps.length === 0) {
      // Verbatim match (original behavior)
      if (!compositeContent.includes(sourceSteps)) {
        console.error(
          `\n❌ ${composite} is out of sync with ${skill}.\n` +
            `   The <step_by_step> content from ${sourcePath}\n` +
            `   must appear verbatim inside ${compositePath} (${phase}).\n` +
            `\n` +
            `   WHY: ${composite} inlines both workflows to avoid fragile\n` +
            `   cross-skill delegation. When you change ${skill},\n` +
            `   copy the updated <step_by_step> into the ${phase}\n` +
            `   of ${compositePath}.`,
        );
        hasError = true;
      }
    } else {
      // Per-step comparison: steps NOT in allowedDivergentSteps must match
      const sourceStepList = splitSteps(sourceSteps);
      for (const step of sourceStepList) {
        if (allowedDivergentSteps.includes(step.num)) continue;
        if (!compositeContent.includes(step.text)) {
          console.error(
            `\n❌ ${composite} is out of sync with ${skill} (step ${step.num}).\n` +
              `   Step ${step.num} from ${sourcePath} must appear verbatim\n` +
              `   inside ${compositePath} (${phase}).\n` +
              `   (Steps ${
                allowedDivergentSteps.join(", ")
              } are allowed to diverge.)`,
          );
          hasError = true;
        }
      }
    }
  }
}

if (hasError) {
  Deno.exit(1);
} else {
  console.log("✅ All composite skills are in sync with their sources.");
}
