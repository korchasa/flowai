import { BenchmarkSkillScenario } from "../../../../../../scripts/benchmarks/lib/types.ts";

export const WriteGodsTasksBasicBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-gods-tasks-basic";
  name = "Write a Task Using GODS Framework";
  skill = "flowai-skill-write-gods-tasks";

  userQuery =
    "/flowai-skill-write-gods-tasks Write a task for migrating the Alpha service from virtual machines to Docker containers. Currently, deployment takes 45 minutes and causes errors during updates. We need to reduce deployment time by 50% and eliminate update errors.";

  checklist = [
    {
      id: "has_goal",
      description:
        "Does the task contain a 'Goal' section that explains the business objective (why we are performing the task)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "has_overview",
      description:
        "Does the task contain an 'Overview' section describing the current state and why the task arose?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "has_definition_of_done",
      description:
        "Does the task contain a 'Definition of Done' section with specific, measurable completion criteria?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "has_solution",
      description:
        "Does the task contain a 'Solution' section with actionable approach to solving the task?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "dod_is_measurable",
      description:
        "Are the Definition of Done criteria measurable (e.g., 'deployment time reduced by 50%') rather than vague (e.g., 'deployment is faster')?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "goal_not_solution",
      description:
        "Does the Goal section focus on the business objective (not the technical solution)? E.g., 'speed up deployment' rather than 'use Docker'.",
      critical: false,
      type: "semantic" as const,
    },
  ];
}();
