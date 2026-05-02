import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: surface vocabulary match ("run", "model") but the user means
// running a local language-model server, not delegating prompts to another IDE.
export const AiIdeRunnerTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-ai-ide-runner-trigger-false-2";
  name = "run a local model server";
  skill = "flowai-skill-ai-ide-runner";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me run a local Llama model on my laptop with Ollama so I can chat with it offline.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-ai-ide-runner`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-ai-ide-runner/SKILL.md` or calling the `Skill` tool with `flowai-skill-ai-ide-runner`.",
    critical: true,
  }];
}();
