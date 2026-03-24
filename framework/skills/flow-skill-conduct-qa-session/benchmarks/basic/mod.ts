import { BenchmarkSkillScenario } from "../../../../../scripts/benchmarks/lib/types.ts";

export const ConductQaSessionBasicBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-skill-conduct-qa-session-basic";
  name = "Conduct structured Q&A session with user";
  skill = "flow-skill-conduct-qa-session";

  interactive = true;

  userQuery =
    "/flow-skill-conduct-qa-session I want to add a caching layer to my web application. Ask me clarifying questions before we proceed.";

  userPersona =
    `You are a developer building a Node.js REST API that handles ~1000 requests/minute.
When asked about the database, say you use PostgreSQL.
When asked about caching needs, say you want to cache API responses and database query results.
When asked about infrastructure, say you prefer managed services but are open to self-hosted.
When asked about TTL/expiration, say 5 minutes for API responses and 1 hour for DB queries.
Answer concisely in 1-2 sentences per question.`;

  checklist = [
    {
      id: "questions_numbered",
      description:
        "Did the agent use numbered questions (1., 2., 3., ...) in at least one response?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "batch_size_reasonable",
      description:
        "Did the agent ask between 1 and 5 questions per response (not overwhelming the user)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "context_provided",
      description:
        'Did the agent provide context or background with questions (not "naked" questions like just "Which database?")?',
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "options_compared",
      description:
        "When presenting choices (e.g., Redis vs Memcached), did the agent compare pros/cons or trade-offs?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "prioritized_questions",
      description:
        "Did the agent start with the most critical or blocking questions first (e.g., current stack, scale)?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "language_matched",
      description:
        "Did the agent respond in the same language as the user (English)?",
      critical: false,
      type: "semantic" as const,
    },
  ];
}();
