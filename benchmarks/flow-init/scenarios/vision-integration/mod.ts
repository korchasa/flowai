import { join } from "@std/path";
import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";
import { copyRecursive } from "../../../../scripts/benchmarks/lib/utils.ts";

export const InitVisionIntegrationBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-init-vision-integration";
  name = "Init Project with Vision Integration (No vision.md)";
  skill = "flow-init";
  stepTimeoutMs = 300_000;

  override async setup(sandboxPath: string) {
    // 1. Copy the flow-init skill files (scripts, assets) to the sandbox
    const sourceInitDir = join(Deno.cwd(), "framework/skills/flow-init");
    const destInitDir = join(sandboxPath, ".cursor/skills/flow-init");

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
  }

  // Instruct the agent to use the existing data and VERIFY the results
  userQuery =
    "/flow-init. I have already prepared 'interview_data.json'. Please skip the interview and proceed directly to generating the assets. AFTER generation, run 'cat AGENTS.md' and 'ls -R documents/' to verify the results.";

  checklist = [
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
      type: "semantic" as const,
    },
    {
      id: "no_vision_md",
      description: "Ensure documents/vision.md does NOT exist.",
      critical: true,
      type: "static" as const,
    },
  ];
}();
