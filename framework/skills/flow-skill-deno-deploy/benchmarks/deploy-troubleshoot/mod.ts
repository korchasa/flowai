import { BenchmarkSkillScenario } from "../../../../../scripts/benchmarks/lib/types.ts";

export const DenoDeployTroubleshootBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-skill-deno-deploy-troubleshoot";
  name = "Troubleshoot Deno Deploy with KV and .gitignore";
  skill = "flow-skill-deno-deploy";

  userQuery =
    '/flow-skill-deno-deploy My app uses Deno.openKv() and works locally with --unstable-kv, but when deployed to Deno Deploy it fails with "TypeError: Deno.openKv is not a function". Also, I have a large .playwright-browsers/ directory that causes slow uploads. How do I fix both issues?';

  checklist = [
    {
      id: "unstable_deno_json",
      description:
        'Did the agent recommend adding "unstable": ["kv"] to deno.json as the fix for the KV error (not a CLI flag)?',
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "no_cli_unstable_flag",
      description:
        "Did the agent explain that deno deploy does NOT support --unstable-kv flags?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "gitignore_solution",
      description:
        "Did the agent recommend adding .playwright-browsers/ to .gitignore to exclude it from uploads?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "no_exclude_flag",
      description:
        "Did the agent mention (or avoid suggesting) that deno deploy does NOT support --exclude flag?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "reads_project_files",
      description:
        "Did the agent read deno.json and/or src/main.ts to understand the project setup?",
      critical: false,
    },
  ];
}();
