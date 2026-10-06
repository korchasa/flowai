import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

export const InitBrownfieldIdempotentBench = new class
  extends AcceptanceTestScenario {
  id = "init-brownfield-idempotent";
  name = "Init Brownfield Project Idempotency Check";
  skill = "init";
  stepTimeoutMs = 600_000;
  interactive = true;
  maxSteps = 20;
  agentsTemplateVars = { PROJECT_NAME: "CustomProject" };

  override async setup(sandboxPath: string) {
    // Overwrite template-generated AGENTS.md with custom content containing markers
    // that the checklist verifies are preserved after init re-run
    await Deno.writeTextFile(
      join(sandboxPath, "AGENTS.md"),
      `# YOU MUST\n- STRICTLY FOLLOW YOUR ROLE.\n---\nCUSTOM CONTENT MARKER\n## Project Information\n- Project Name: CustomProject\n`,
    );
    // The runner commits the sandbox as `init` BEFORE this hook runs. Commit
    // the overwrite too, or the judge sees a 204-line AGENTS.md replaced by six
    // lines in the working tree and blames the agent for not preserving it
    // (observed 2026-09-02 on codex, with the agent having left the file alone).
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "Project's own AGENTS.md"]);
  }

  userQuery = "/init";

  // 2026-08-30: the persona forbade the very act `dev_commands_created` scores.
  // The dead version said "When shown diffs, decline all changes (say 'no' to
  // applying diffs)" — but deno.json already exists in the fixture, so wiring
  // check/dev/prod into it IS a diff, and an agent that took the instruction
  // literally ("just create any missing documents") failed the item for obeying
  // the user. The premise of this scenario is that AGENTS.md survives a re-run,
  // not that nothing may be written at all; the refusal is now scoped to that
  // one file.
  userPersona =
    `You are a developer running init on a project that already has AGENTS.md.
When the agent detects existing components, tell it to 'create missing components but preserve existing AGENTS.md'.
When shown a diff to AGENTS.md, decline it — that file stays exactly as it is.
Approve every other change, including creating the missing documents and adding the missing standard commands (check, dev, prod) to deno.json.
When asked for the application entry point (the fixture ships none), say: use src/main.ts and create it. Never ask for placeholder or no-op dev/prod tasks.`;

  checklist = [
    {
      id: "agents_md_preserved",
      description:
        "Was the existing AGENTS.md preserved (contains 'CUSTOM CONTENT MARKER')?",
      critical: true,
    },
    {
      id: "missing_components_created",
      description:
        "Were missing components (documents/requirements.md) created?",
      critical: true,
    },
    {
      id: "user_asked_about_overwrite",
      description:
        "Did the agent ask the user about overwriting existing files or show diffs before applying?",
      critical: true,
    },
    {
      id: "dev_commands_created",
      description:
        "Does the project's OWN command runner end up carrying a real standard interface — check / test / dev / prod as tasks in deno.json, scripts in package.json, or targets in a Makefile — each wired to actual tooling rather than a stub echo? Either shape passes: the command inline in the task, or the task calling a script. This item does NOT adjudicate which; the skill bans wrapper scripts only when the runner can do the job directly, and that condition is not decidable from the artefacts. Twice stale before 2026-08-20: the item first demanded `scripts/check.ts` and failed a run that used plain tasks, then demanded its absence and failed a run that used a wrapper.",
      critical: true,
    },
  ];
}();
