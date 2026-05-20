import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Tests plugin/user-level first semantics for flowai-update.
 *
 * Most users are expected to receive flowai through native plugins or
 * user-level installs, not project-local `flowai sync`. The command must treat
 * non-project framework sources as read-only and update only project-owned
 * artifacts.
 */
export const FlowUpdatePluginUserScopeBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-update-plugin-user-scope";
  name = "Updates project artifacts only for plugin/user-level installs";
  skill = "flowai-update";
  stepTimeoutMs = 300_000;

  maxSteps = 25;

  agentsTemplateVars = {
    PROJECT_NAME: "PluginFirstProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [
      {
        message: "Initial project state",
        files: [
          "AGENTS.md",
          ".claude/skills/flowai-commit/SKILL.md",
          ".claude/skills/flowai-update/assets/AGENTS.template.md",
        ],
      },
    ],
    expectedOutcome:
      "Agent treats plugin/user-level framework source as read-only, proposes AGENTS.md update, and does not run flowai sync or rewrite installed primitive files",
  };

  override async setup(sandboxPath: string) {
    await Deno.writeTextFile(
      join(sandboxPath, "AGENTS.md"),
      [
        "# PluginFirstProject",
        "",
        "## Project tooling Stack",
        "- TypeScript, Deno",
        "",
        "## Planning Rules",
        "",
        "- **Verification Steps**: Plan MUST include specific verification commands.",
        "",
      ].join("\n"),
    );

    const updateSkillDir = join(
      sandboxPath,
      ".claude",
      "skills",
      "flowai-update",
    );
    const localAssetPath = join(updateSkillDir, "assets", "AGENTS.template.md");
    await Deno.mkdir(join(updateSkillDir, "assets"), { recursive: true });
    await Deno.writeTextFile(
      localAssetPath,
      [
        "# {{PROJECT_NAME}}",
        "",
        "## Project tooling Stack",
        "{{TOOLING_STACK}}",
        "",
        "## Planning Rules",
        "",
        "- **Verification Steps**: Plan MUST include specific verification commands.",
        "- **Proactive Resolution**: Before asking the user, exhaust available resources.",
        "",
      ].join("\n"),
    );

    const projectLocalPrimitive = join(
      sandboxPath,
      ".claude",
      "skills",
      "flowai-commit",
      "SKILL.md",
    );
    await Deno.mkdir(join(projectLocalPrimitive, ".."), { recursive: true });
    await Deno.writeTextFile(
      projectLocalPrimitive,
      [
        "---",
        "name: flowai-commit",
        "description: Commit workflow with deliberately outdated commands.",
        "---",
        "",
        "# Commit",
        "",
        "Run `deno test` before committing.",
        "",
      ].join("\n"),
    );

    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "Initial project state"]);
  }

  userQuery =
    "/flowai-update My flowai skills are installed through an IDE plugin/user-level install. Do not run flowai CLI commands. Reconcile my project AGENTS.md with the framework instructions, and do not rewrite installed skills or plugin cache files.";

  checklist = [
    {
      id: "did_not_run_flowai_cli",
      description:
        "Did the agent avoid running `flowai update`, `flowai sync`, or any flowai CLI lifecycle command?",
      critical: true,
    },
    {
      id: "used_readonly_framework_source",
      description:
        "Did the agent use a read-only framework/template source, such as the skill-local `assets/AGENTS.template.md`, instead of requiring project-local synced assets?",
      critical: true,
    },
    {
      id: "updated_only_project_artifacts",
      description:
        "Did the agent propose changes only to project-owned artifacts such as `AGENTS.md`, not to installed skills, plugin cache, or user-level directories?",
      critical: true,
    },
    {
      id: "did_not_adapt_primitive",
      description:
        "Did the agent avoid rewriting `.claude/skills/flowai-commit/SKILL.md` and instead leave primitive adaptation to `flowai-adapt` if needed?",
      critical: true,
    },
    {
      id: "found_missing_proactive_resolution",
      description:
        'Did the agent identify that `AGENTS.md` is missing the "Proactive Resolution" planning rule from the template?',
      critical: true,
    },
  ];
}();
