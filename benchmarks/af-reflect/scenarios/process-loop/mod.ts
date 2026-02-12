import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const ReflectLoopBench = new class extends BenchmarkSkillScenario {
  id = "af-reflect-loop";
  name = "Reflect on Logic Loop";
  skill = "af-reflect";

  userQuery =
    "Analyze the agent's performance in transcript.txt using af-reflect. Identify the main logical error.";

  checklist = [
    {
      id: "read_transcript",
      description: "Did the agent read transcript.txt?",
      critical: true,
    },
    {
      id: "identify_loop",
      description:
        "Did the agent identify the repetitive actions (loop) or failure to check file existence?",
      critical: true,
      type: "semantic",
    },
    {
      id: "propose_fix",
      description:
        "Did the agent propose a process fix (e.g., check file existence first)?",
      critical: true,
      type: "semantic",
    },
  ];
}();
