import { BenchmarkScenario } from "../../../lib/types.ts";
import { join } from "@std/path";
import { copyRecursive } from "../../../lib/utils.ts";

const SKILL_PATH = "catalog/skills/af-init/SKILL.md";

export const InitVisionIntegrationBench: BenchmarkScenario = {
  id: "af-init-vision-integration",
  name: "Init Project with Vision Integration (No vision.md)",
  targetAgentPath: SKILL_PATH,

  setup: async (sandboxPath: string) => {
    // 1. Copy the af-init skill files (scripts, assets) to the sandbox
    const sourceInitDir = join(Deno.cwd(), "catalog/skills/af-init");
    const destInitDir = join(sandboxPath, ".cursor/skills/af-init");

    await Deno.mkdir(destInitDir, { recursive: true });
    await copyRecursive(sourceInitDir, destInitDir);

    // 2. Pre-create interview_data.json to simulate a completed interview
    const interviewData = {
      project_name: "SuperApp",
      vision_statement: "A super app for everything.",
      target_audience: "Everyone.",
      problem_statement: "Too many apps.",
      solution_differentiators: "One app.",
      risks_assumptions: "None.",
      stack: ["Deno", "TypeScript"],
      architecture: "Monolith",
      key_decisions: "Use Deno",
      preferences: ["tdd"],
    };

    await Deno.writeTextFile(
      join(sandboxPath, "interview_data.json"),
      JSON.stringify(interviewData, null, 2),
    );
  },

  // Instruct the agent to use the existing data and VERIFY the results
  userQuery:
    "/af-init. I have already prepared 'interview_data.json'. Please skip the interview and proceed directly to generating the assets. AFTER generation, run 'cat AGENTS.md' and 'ls -R documents/' to verify the results.",

  checklist: [
    {
      id: "agents_md_created",
      description: "Was AGENTS.md created?",
      critical: true,
    },
    {
      id: "vision_in_agents_md",
      description:
        "Does AGENTS.md contain the Vision section with 'SuperApp' details?",
      critical: true,
      type: "semantic",
    },
    {
      id: "no_vision_md",
      description: "Ensure documents/vision.md does NOT exist.",
      critical: true,
      type: "static",
    },
  ],
};
