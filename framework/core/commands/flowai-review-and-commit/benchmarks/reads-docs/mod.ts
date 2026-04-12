import { BenchmarkSkillScenario } from "@bench/types.ts";
import { runGit } from "@bench/utils.ts";

export const ReviewAndCommitReadsDocsBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-review-and-commit-reads-docs";
  name = "Review-and-commit reads SRS and SDS";
  skill = "flowai-review-and-commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "FileTool",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override async setup(sandboxPath: string) {
    // Create a staged change for the agent to review and commit
    const { join } = await import("jsr:@std/path@1/join");
    await Deno.writeTextFile(
      join(sandboxPath, "src", "main.ts"),
      "export function process(input: string): string {\n  return input.trim().toUpperCase();\n}\n",
    );
    await runGit(sandboxPath, ["add", "src/main.ts"]);
  }

  userQuery = "/flowai-review-and-commit";

  checklist = [
    {
      id: "read_srs",
      description: "Did the agent read 'documents/requirements.md'?",
      critical: true,
    },
    {
      id: "read_sds",
      description: "Did the agent read 'documents/design.md'?",
      critical: true,
    },
  ];
}();
