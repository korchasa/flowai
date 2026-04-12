import { BenchmarkSkillScenario } from "@bench/types.ts";
import { join } from "@std/path";

export const InitClaudeMdSymlinksBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-init-claude-md-symlinks";
  name = "Init Creates CLAUDE.md Symlinks";
  skill = "flowai-init";
  stepTimeoutMs = 600_000;
  interactive = true;
  maxSteps = 25;

  agentsTemplateVars = {
    PROJECT_NAME: "SymlinkTest",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
    await Deno.mkdir(join(sandboxPath, "scripts"), { recursive: true });
    await Deno.mkdir(join(sandboxPath, "src"), { recursive: true });
    await Deno.writeTextFile(
      join(sandboxPath, "src", "main.ts"),
      "console.log('hello');",
    );
    await Deno.writeTextFile(
      join(sandboxPath, "deno.json"),
      JSON.stringify({ tasks: { dev: "deno run src/main.ts" } }),
    );
  }

  userQuery = "/flowai-init";

  userPersona = `You are a developer starting project 'SymlinkTest'.
Your vision is 'Test project for symlinks'.
Target audience is 'Developers'.
The problem is 'No documentation' and the solution is 'Auto-generated docs'.
There are no major risks.
The tech stack is 'Deno' and 'TypeScript'.
The architecture is 'Simple CLI app'.
When asked for project details or starts an interview, provide these details.
Always confirm when asked to overwrite or create files.
Always confirm when asked to apply diffs.
When asked about devcontainer, say no.`;

  checklist = [
    {
      id: "agents_md_created",
      description: "Was AGENTS.md created in the root directory?",
      critical: true,
    },
    {
      id: "claude_md_root_symlink",
      description:
        "Was CLAUDE.md created in the root directory (as a symlink to AGENTS.md or a standalone file)?",
      critical: true,
    },
    {
      id: "no_hallucinations",
      description:
        "Does AGENTS.md only document tooling and architecture that actually exists in the project (Deno, TypeScript, src/main.ts)?",
      critical: true,
    },
  ];
}();
