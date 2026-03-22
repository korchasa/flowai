import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const ConfigureDenoCommandsBasicBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-skill-configure-deno-commands-basic";
  name = "Configure standard Deno development commands";
  skill = "flow-skill-configure-deno-commands";
  stepTimeoutMs = 120_000;

  userQuery =
    "/flow-skill-configure-deno-commands Set up the standard Deno development commands (check, test, dev, prod) for this project.";

  checklist = [
    {
      id: "deno_json_has_check_task",
      description:
        'Does deno.json contain a "check" task that runs comprehensive verification (fmt, lint, tests)?',
      critical: true,
    },
    {
      id: "deno_json_has_test_task",
      description: 'Does deno.json contain a "test" task that runs tests?',
      critical: true,
    },
    {
      id: "deno_json_has_dev_task",
      description: 'Does deno.json contain a "dev" task with watch mode?',
      critical: true,
    },
    {
      id: "deno_json_has_prod_task",
      description: 'Does deno.json contain a "prod" task for production mode?',
      critical: false,
    },
    {
      id: "check_script_created",
      description:
        "Was a scripts/check.ts file created with the verification logic (fmt --check, lint, test)?",
      critical: true,
    },
    {
      id: "check_script_exits_on_failure",
      description:
        "Does the check script use non-zero exit codes on failure (Deno.exit(1) or equivalent)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "existing_config_preserved",
      description:
        "Were existing deno.json settings (compilerOptions, imports) preserved when adding tasks?",
      critical: true,
    },
    {
      id: "tasks_reference_scripts",
      description:
        "Do the deno.json tasks point to script files in scripts/ directory (not inline complex commands)?",
      critical: false,
      type: "semantic" as const,
    },
  ];
}();
