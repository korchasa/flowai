import { join } from "@std/path";
import { BenchmarkSkillScenario } from "../../../../../scripts/benchmarks/lib/types.ts";

export const PlanVariantsObviousBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-plan-variants-obvious";
  name = "Plan Variants - Obvious Task";
  skill = "flow-plan";

  async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
  }

  userQuery =
    "/flow-plan Plan the creation of a 'hello.txt' file containing 'Hello World'. Context: This is a test project. No other requirements. Just plan it.";

  checklist = [
    {
      id: "whiteboard_created",
      description:
        "Did the agent create/write to a file in 'documents/whiteboards/' directory (as required by the planning process)?",
      critical: true,
    },
    {
      id: "single_variant",
      description:
        "Did the agent present EXACTLY ONE implementation variant in the chat? It should NOT offer alternatives for such a simple task.",
      critical: true,
      type: "semantic" as const,
    },
  ];
}();
