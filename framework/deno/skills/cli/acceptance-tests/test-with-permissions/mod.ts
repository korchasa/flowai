import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const DenoCliTestPermsBench = new class extends AcceptanceTestScenario {
  id = "cli-test-permissions";
  name = "Run Deno tests and diagnose permission requirements";
  skill = "cli";
  agentsTemplateVars = {
    PROJECT_NAME: "DenoKvServer",
    TOOLING_STACK: "- TypeScript\n- Deno",
    ARCHITECTURE: "- Deno KV for persistence\n- JSR for dependency management",
  };

  userQuery =
    "/cli I want to run the tests for this project. The server uses Deno KV. What permissions do I need and what is the correct command? Also, how do I add a new dependency from JSR?";

  checklist = [
    {
      id: "reads_deno_json",
      description:
        "Did the agent read deno.json to understand the project configuration and existing tasks?",
      critical: true,
    },
    {
      // Rescoped 2026-08-25. The first version demanded `deno task test` as the
      // PREFERRED command, and the sweep of 2026-08-24 failed a run that was
      // right: this fixture's task is `deno test --allow-read --allow-env`, the
      // server calls `Deno.openKv()`, so the task as defined cannot run these
      // tests. The agent offered the raw command and said the task "would need
      // updating to include --unstable-kv" — which is the diagnosis this
      // scenario's own name asks for. The item now tests that the agent routes
      // the command to the task rather than leaving `deno test` as the project's
      // answer; naming the task's missing flag is part of that, not a failure of
      // it. Recommending the raw command with no mention of the task still fails.
      id: "suggests_task_test",
      description:
        'Did the agent treat "deno task test" as where this command belongs — either recommending it directly, or saying the task needs the missing flag added? Answering with a bare `deno test ...` and never mentioning the task fails this item.',
      critical: true,
    },
    {
      id: "mentions_unstable_kv",
      description:
        "Did the agent mention that Deno KV requires --unstable-kv flag or unstable config in deno.json?",
      critical: false,
    },
    {
      id: "explains_permissions",
      description:
        "Did the agent explain the relevant permissions (--allow-read, --allow-env, --allow-net) and their purpose?",
      critical: false,
    },
    {
      id: "deno_add_jsr",
      description:
        'Did the agent explain "deno add jsr:@scope/package" as the way to add a JSR dependency?',
      critical: false,
    },
  ];
}();
