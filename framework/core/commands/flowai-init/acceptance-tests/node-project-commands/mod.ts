import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Tests that flowai-init respects the project's native command runner (package.json scripts)
 * instead of forcing Deno-style scripts/ directory on a Node.js project.
 *
 * The fixture is a Node.js/Express project with package.json scripts.
 * The skill MUST configure standard commands (check, test, dev) via package.json,
 * NOT by creating scripts/check.ts or deno.json tasks.
 */
export const InitNodeProjectCommandsBench =
  new (class extends AcceptanceTestScenario {
    id = "flowai-init-node-project-commands";
    name = "Init respects Node.js project command runner (package.json)";
    skill = "flowai-init";
    stepTimeoutMs = 600_000;
    interactive = true;
    maxSteps = 20;
    agentsTemplateVars = {
      PROJECT_NAME: "ExpressAPI",
      TOOLING_STACK: "- TypeScript\n- Express",
    };

    override async setup(sandboxPath: string) {
      await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
    }

    userQuery = "/flowai-init";

    userPersona =
      `You are a developer running flowai-init on an existing Node.js/Express project.
The project uses package.json scripts (npm run test, npm run lint, etc.) — NOT Deno.
When the agent asks questions, confirm defaults. Approve all file creations.
If the agent asks about Deno tooling, say NO — this is a Node.js project.
Keep answers brief and affirmative.`;

    checklist = [
      {
        id: "agents_md_created",
        description: "Was AGENTS.md created?",
        critical: true,
      },
      {
        id: "commands_use_package_json",
        description:
          "Were development commands configured via package.json scripts (npm run check, npm run test, etc.) rather than creating scripts/check.ts or deno.json tasks?",
        critical: true,
      },
      {
        id: "no_deno_json_created",
        description:
          "Was deno.json NOT created (since this is a Node.js project, not a Deno project)?",
        critical: true,
      },
      {
        id: "no_forced_scripts_dir",
        description:
          "Did the agent avoid forcing a scripts/ directory with .ts check scripts on this Node.js project?",
        critical: true,
      },
      {
        id: "detected_node_stack",
        description:
          "Did the agent correctly detect this as a Node.js/Express project (from package.json)?",
        critical: true,
      },
    ];
  })();
