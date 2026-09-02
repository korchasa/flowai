import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const OrchestrateWorkParallelDelegation = new class
  extends AcceptanceTestScenario {
  id = "orchestrate-work-parallel-delegation";
  name = "Orchestrate work — parallel delegation";
  skill = "orchestrate-work";
  interactive = false;

  userQuery =
    "Три независимых участка: миграция схемы, обновление клиента и правка документации. Раздели работу и веди её параллельно.";

  checklist = [
    {
      id: "work_split_identified",
      description: "Did the agent identify the three independent work items?",
      critical: true,
    },
    {
      id: "parallel_delegation",
      description:
        "Did the agent dispatch the independent items to subagents rather than doing them itself?",
      critical: true,
    },
    {
      id: "delegation_results_merged",
      description: "Did the agent merge what the workers produced?",
      critical: true,
    },
    {
      id: "no_scope_creep",
      description: "Did the agent touch only the three named areas?",
      critical: false,
    },
  ];
}();
