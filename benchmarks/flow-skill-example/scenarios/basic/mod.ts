import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const FlowSkillExampleBasicBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-skill-example-basic";
  name = "Rename variable across all project files";
  skill = "flow-skill-example";

  userQuery =
    "Rename the variable `userCount` to `userTotal` across all files in this project.";

  fixturePath = "benchmarks/flow-skill-example/scenarios/basic/fixture";

  maxSteps = 15;

  checklist = [
    {
      id: "no_old_name_in_ts_files",
      description:
        "Are there zero remaining occurrences of the identifier `userCount` in any .ts file in the project?",
      critical: true,
    },
    {
      id: "new_name_in_config",
      description:
        "Does config.ts export a constant named `userTotal` (not `userCount`)?",
      critical: true,
    },
    {
      id: "new_name_in_stats",
      description:
        "Does stats.ts import and use `userTotal` from config.ts instead of `userCount`?",
      critical: true,
    },
    {
      id: "new_name_in_report",
      description:
        "Does report.ts import and use `userTotal` from config.ts instead of `userCount`?",
      critical: true,
    },
    {
      id: "type_check_passes",
      description:
        "Does `deno check **/*.ts` complete without errors after the rename?",
      critical: true,
    },
    {
      id: "reported_changed_files",
      description:
        "Did the agent report which files were changed and how many occurrences were replaced?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "no_unrelated_changes",
      description:
        "Did the agent avoid modifying unrelated code (e.g., comments that do not reference the variable by name, or other identifiers)?",
      critical: false,
      type: "semantic" as const,
    },
  ];
}();
