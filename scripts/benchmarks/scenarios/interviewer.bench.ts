import { BenchmarkScenario } from "../lib/types.ts";
import { join } from "@std/path";

const AGENT_PATH = ".cursor/agents/interviewer.md";

/**
 * Сценарий: Уточнение требований к новой фиче.
 * Агент должен задать уточняющие вопросы, так как запрос слишком общий.
 */
export const InterviewerClarifyFeatureBench: BenchmarkScenario = {
  id: "interviewer-clarify-feature",
  name: "Clarify Vague Feature Request",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await Deno.writeTextFile(
      join(sandboxPath, "README.md"),
      "# Project X\nA simple web application.",
    );
  },

  userQuery:
    "Я хочу добавить систему аутентификации в проект. С чего мне начать?",

  checklist: [
    {
      id: "asked_questions",
      description:
        "Did the agent ask clarifying questions instead of just giving a list of steps?",
      critical: true,
    },
    {
      id: "use_ask_question_tool",
      description: "Did the agent use the 'AskQuestion' tool?",
      critical: false,
    },
    {
      id: "batching_limit",
      description: "Did the agent ask between 1 and 3 questions?",
      critical: true,
    },
    {
      id: "relevance",
      description:
        "Are the questions relevant to authentication (e.g., providers, JWT vs Session)?",
      critical: true,
    },
  ],
};

/**
 * Сценарий: Сбор информации о баге.
 * Агент должен запросить шаги для воспроизведения и логи.
 */
export const InterviewerBugReportBench: BenchmarkScenario = {
  id: "interviewer-bug-report",
  name: "Gather Bug Details",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await Deno.writeTextFile(
      join(sandboxPath, "error.log"),
      "Uncaught TypeError: Cannot read property 'id' of undefined at user.ts:42",
    );
  },

  userQuery: "У меня падает приложение с ошибкой в консоли. Помоги исправить.",

  checklist: [
    {
      id: "asked_for_reproduction",
      description: "Did the agent ask for reproduction steps?",
      critical: true,
    },
    {
      id: "asked_for_logs",
      description:
        "Did the agent ask to see the logs or check the existing error.log?",
      critical: false,
    },
    {
      id: "precise_questions",
      description:
        "Are the questions specific to the error mentioned (if agent read the file)?",
      critical: false,
    },
  ],
};

/**
 * Сценарий: Уточнение архитектурного решения.
 * Агент должен помочь выбрать между вариантами.
 */
export const InterviewerArchitectureChoiceBench: BenchmarkScenario = {
  id: "interviewer-arch-choice",
  name: "Architecture Decision Support",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await Deno.writeTextFile(
      join(sandboxPath, "deno.json"),
      `{ "tasks": { "start": "deno run main.ts" } }`,
    );
  },

  userQuery:
    "Мне нужно выбрать базу данных для проекта: PostgreSQL или MongoDB. Что посоветуешь?",

  checklist: [
    {
      id: "asked_about_data_structure",
      description:
        "Did the agent ask about the data structure (relational vs non-relational)?",
      critical: true,
    },
    {
      id: "asked_about_scaling",
      description:
        "Did the agent ask about scaling or performance requirements?",
      critical: false,
    },
    {
      id: "no_premature_recommendation",
      description:
        "Did the agent avoid giving a final recommendation without enough info?",
      critical: true,
    },
  ],
};
