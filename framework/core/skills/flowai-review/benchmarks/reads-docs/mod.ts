import { BenchmarkSkillScenario } from "@bench/types.ts";
import { runGit } from "@bench/utils.ts";

export const ReviewReadsDocsBench = new class extends BenchmarkSkillScenario {
  id = "flowai-review-reads-docs";
  name = "Review reads SRS and SDS before reviewing";
  skill = "flowai-review";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "FileTool",
    TOOLING_STACK: "- TypeScript\n- Deno",
    generateDocuments: true,
  };

  override async setup(sandboxPath: string) {
    // Create a staged change for the agent to review
    const { join } = await import("jsr:@std/path@1/join");
    await Deno.writeTextFile(
      join(sandboxPath, "src", "main.ts"),
      "export function process(input: string): string {\n  return input.trim().toUpperCase();\n}\n",
    );
    await runGit(sandboxPath, ["add", "src/main.ts"]);
  }

  userQuery = "/flowai-review";

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
    {
      id: "verdict_given",
      description:
        "Did the agent produce a verdict (Approve, Request Changes, or Needs Discussion)?",
      critical: true,
    },
  ];
}();
