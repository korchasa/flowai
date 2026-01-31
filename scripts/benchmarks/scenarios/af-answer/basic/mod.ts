import { BenchmarkScenario } from "../../../lib/types.ts";

const SKILL_PATH = "catalog/skills/af-answer/SKILL.md";

export const AnswerBasicBench: BenchmarkScenario = {
  id: "af-answer-basic",
  name: "Basic Codebase Q&A",
  targetAgentPath: SKILL_PATH,
  skillName: "af-answer",

  setup: async (_sandboxPath: string) => {
    // Fixtures are copied automatically
  },

  userQuery:
    "/af-answer How is password hashing implemented in this project? Does it follow the requirements?",

  checklist: [
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
      type: "semantic",
    },
  ],
};
