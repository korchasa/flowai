import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReflectNoSpuriousInvocationBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-reflect-no-spurious-invocation";
  name = "Reflect — No Spurious Auto-Invocation";
  skill = "flowai-skill-reflect";
  maxSteps = 5;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Summarize in two sentences what tools you called so far in this conversation.";

  checklist = [
    {
      id: "no_reflect_workflow",
      description:
        "Did the agent NOT execute the flowai-skill-reflect workflow? A plain recap of tool calls is expected; creating a reflection report with process/technical/context/knowledge sections or listing 'behavioral errors' / 'technical decisions' indicates spurious auto-invocation.",
      critical: true,
    },
    {
      id: "no_reflection_file",
      description:
        "Did the agent NOT create any reflection artifact file (e.g., documents/reflections/, reflection.md)?",
      critical: true,
    },
    {
      id: "direct_answer",
      description:
        "Did the agent answer directly with a short recap of tool calls, rather than starting a formal self-analysis procedure?",
      critical: true,
    },
  ];
}();
