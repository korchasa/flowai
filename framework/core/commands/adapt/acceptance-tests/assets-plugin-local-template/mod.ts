import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Plugin-install layout: the AGENTS template lives ONLY as a skill-local plugin
 * asset (`.claude/skills/adapt/assets/AGENTS.template.md`) — there is NO
 * `.claude/assets/` directory. A plugin-blind implementation that reads only
 * `{ide}/assets/` cannot find the template ("skill just doesn't see the file").
 *
 * The planted template carries a framework rule that AGENTS.md is missing, so a
 * pass REQUIRES actually reading the skill-local template — discovery alone is
 * proven by detecting the gap, not by a loose "looks fine" claim.
 */
export const FlowAdaptPluginLocalTemplateBench = new class
  extends AcceptanceTestScenario {
  id = "assets-plugin-local-template";
  name = "Adapt resolves AGENTS template from skill-local plugin asset";
  skill = "adapt";
  stepTimeoutMs = 300_000;

  maxSteps = 20;

  agentsTemplateVars = {
    PROJECT_NAME: "AcmeApp",
    TOOLING_STACK: "- Node.js 20, npm test, eslint",
  };

  override sandboxState = {
    commits: [
      {
        message:
          "Plugin-style install: skill-local template, no .claude/assets",
        files: [
          ".flowai.yaml",
          ".claude/skills/adapt/assets/AGENTS.template.md",
          "AGENTS.md",
        ],
      },
    ],
    expectedOutcome:
      "Agent finds the template at the skill-local plugin asset path, compares " +
      "it to AGENTS.md, and detects the missing framework rule",
  };

  override async setup(sandboxPath: string) {
    await Deno.writeTextFile(
      join(sandboxPath, ".flowai.yaml"),
      'version: "1.1"\nides:\n  - claude\npacks:\n  - core\n',
    );

    // Simulate an IDE-plugin install: there is NO project-local `.claude/assets/`.
    // The harness mounts pack assets there by default (CLI-sync layout), so we
    // remove it — the skill-local plugin asset below must be the ONLY template.
    const standardAssets = join(sandboxPath, ".claude", "assets");
    try {
      await Deno.remove(standardAssets, { recursive: true });
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }

    // Skill-local plugin asset — the ONLY copy of the template in the project.
    const assetsDir = join(sandboxPath, ".claude", "skills", "adapt", "assets");
    await Deno.mkdir(assetsDir, { recursive: true });
    const template = `# Core Project Rules
- Follow your assigned role strictly.
- Verify every change by running appropriate tests or scripts.
- Surface every decision above class/method level to the human for approval.

## Project Information
- Project Name: {{PROJECT_NAME}}

## Project tooling Stack
{{TOOLING_STACK}}
`;
    await Deno.writeTextFile(join(assetsDir, "AGENTS.template.md"), template);

    // Project artifact MISSING the third framework rule; placeholders resolved.
    const agentsMd = `# Core Project Rules
- Follow your assigned role strictly.
- Verify every change by running appropriate tests or scripts.

## Project Information
- Project Name: AcmeApp

## Project tooling Stack
- Node.js 20, npm test, eslint
`;
    await Deno.writeTextFile(join(sandboxPath, "AGENTS.md"), agentsMd);

    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Plugin-style install: skill-local template, no .claude/assets",
    ]);
  }

  userQuery = "/adapt --assets";

  checklist = [
    {
      id: "located_skill_local_template",
      description:
        "Did the agent locate and read the AGENTS template from the skill-local " +
        "plugin asset path (.claude/skills/adapt/assets/AGENTS.template.md), " +
        "instead of reporting the template as missing or only checking " +
        ".claude/assets/?",
      critical: true,
    },
    {
      id: "detected_missing_framework_rule",
      description:
        "Did the agent detect that AGENTS.md is MISSING the framework rule about " +
        "surfacing every decision above class/method level to the human for " +
        "approval (a rule present only in the template)? Detecting this requires " +
        "actually reading the skill-local template.",
      critical: true,
    },
    {
      id: "ignored_placeholders",
      description:
        "Did the agent avoid flagging the {{PROJECT_NAME}} / {{TOOLING_STACK}} " +
        "template placeholders as differences?",
      critical: false,
    },
    {
      id: "asked_confirmation",
      description:
        "Did the agent propose the AGENTS.md update and ask for user " +
        "confirmation before writing?",
      critical: false,
    },
  ];
}();
