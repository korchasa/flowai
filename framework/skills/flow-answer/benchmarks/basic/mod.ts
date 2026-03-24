import { BenchmarkSkillScenario } from "../../../../../scripts/benchmarks/lib/types.ts";

export const AnswerBasicBench = new class extends BenchmarkSkillScenario {
  id = "flow-answer-basic";
  name = "Basic Codebase Q&A";
  skill = "flow-answer";

  userQuery =
    "/flow-answer How is password hashing implemented in this project? Does it follow the requirements?";

  checklist = [
    {
      id: "docs_read",
      description:
        "Did the agent read documents/requirements.md and documents/design.md?",
      critical: true,
    },
    {
      id: "code_read",
      description: "Did the agent read src/auth.service.ts?",
      critical: true,
    },
    {
      id: "correct_answer",
      description:
        "Did the agent correctly identify that bcrypt is used for hashing as required?",
      critical: true,
      type: "semantic" as const,
    },
  ];
}();
