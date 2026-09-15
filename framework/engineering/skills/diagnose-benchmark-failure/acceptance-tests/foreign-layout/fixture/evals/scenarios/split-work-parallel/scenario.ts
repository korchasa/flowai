// One graded scenario for this project's evaluation harness.
export const scenario = {
  name: "split-work-parallel",
  target: "split-work",
  prompt:
    "Три независимых участка: миграция схемы, обновление клиента и правка документации. Раздели работу и веди её параллельно.",
  checks: [
    { key: "work_split_identified", text: "Did the agent name the three independent work items?" },
    { key: "parallel_delegation", text: "Did the agent dispatch the independent items to subagents instead of doing them itself?" },
    { key: "worker_results_merged", text: "Did the agent merge what the workers produced?" },
    { key: "no_scope_creep", text: "Did the agent touch only the three named areas?" },
  ],
};
