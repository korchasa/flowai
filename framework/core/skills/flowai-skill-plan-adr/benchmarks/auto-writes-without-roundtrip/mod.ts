import { BenchmarkSkillScenario } from "@bench/types.ts";

export const PlanAdrAutoWritesBench = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-adr-auto-writes-without-roundtrip";
  name =
    "ADR skill auto-writes file after Solution; no chat draft preview, no approve-before-write prompt";
  skill = "flowai-skill-plan-adr";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  interactive = true;
  userPersona =
    `You are a developer who has already made a decision and wants the agent to record it. You will give all required context in the first message and you will NOT engage in long back-and-forth.

If the agent presents 2+ variants and asks you to pick one, briefly pick the variant that matches the chosen path you stated. Do NOT add new alternatives. Do NOT review drafts.

If the agent shows you a full draft of the ADR body and asks for approval before writing the file (questions like "does this draft look good?", "ready to write?", "shall I save this?", "want any changes before I write?"), you MUST respond with "I asked you to record the decision — write the file now and stop asking. I'll edit in the file if anything needs changing." This response indicates the agent failed the auto-write requirement.

Otherwise keep replies short — 1 sentence each. Never write or edit the ADR yourself.`;

  userQuery =
    "/flowai-skill-plan-adr Record the decision: we picked Postgres-native pub/sub (LISTEN/NOTIFY) over Redis Streams for the job queue. Reasons: zero additional infrastructure, transactional integrity with the main DB. Redis Streams was considered but rejected because the extra ops cost outweighs the perf benefit at our scale (<10k events/min). Plan the migration too.";

  checklist = [
    {
      id: "adr_file_created",
      description:
        "Did the agent create a file under 'documents/adr/' (path matches 'documents/adr/<YYYY-MM-DD>-<slug>.md')?",
      critical: true,
    },
    {
      id: "no_draft_approval_prompt",
      description:
        "Inspect the conversation log. The agent MUST NOT have asked the user to approve a full draft before writing the file. Specifically: the agent must NOT have emitted the entire ADR body (Context+Alternatives+Decision+Consequences+DoD+Solution) in chat with a prompt like 'review this', 'approve before write', 'shall I save?', 'want changes before I write?'. Asking the user to PICK A VARIANT during the variant-analysis step is OK and expected (this is variant selection, not draft approval). Asking for missing decision context (chosen path, alternatives, scope) is also OK. The forbidden pattern is showing the FULL ADR body and waiting for approval.",
      critical: true,
    },
    {
      id: "summary_only_after_write",
      description:
        "Inspect the agent's chat output AFTER the file was written. The post-write message MUST be a brief summary (file path, ADR ID, optionally DoD count or short note). The agent MUST NOT re-paste the full ADR body in chat after writing. A short ≤10-line confirmation message is required; a full body dump is a FAIL.",
      critical: false,
    },
    {
      id: "frontmatter_id_assigned",
      description:
        "Read the created ADR file. Does its YAML frontmatter contain a line matching 'id: ADR-NNNN' (4-digit zero-padded)?",
      critical: true,
    },
    {
      id: "decision_section_matches_user_intent",
      description:
        "Read the '## Decision' section of the ADR. Does it record that Postgres-native pub/sub (LISTEN/NOTIFY) was chosen over Redis Streams? The decision must reflect the user's stated choice, not invent a different one.",
      critical: true,
    },
    {
      id: "no_user_anger_response",
      description:
        "Inspect the conversation log. Did the user ever respond with the anger phrase 'I asked you to record the decision — write the file now and stop asking'? If yes, the agent triggered the forbidden draft-approval pattern (FAIL). If no, this check passes.",
      critical: true,
    },
  ];
}();
