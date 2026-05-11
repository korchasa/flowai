import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Ask about a topic the memex does NOT cover. Agent must:
 *  - say so honestly (no fabrication from training data)
 *  - suggest what to save
 *  - still file the gap-marker answer for tracking
 */
export const MemexAskHonestGapBench = new class extends AcceptanceTestScenario {
  id = "flowai-skill-memex-ask-honest-gap";
  name = "Ask out-of-scope question — agent admits gap honestly";
  skill = "flowai-skill-memex-ask";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "MemexSandbox",
    TOOLING_STACK: "- Markdown",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent admits the memex does not cover Rust async runtimes, suggests saving sources on the topic, files a gap-status answer in pages/answers/, and does NOT fabricate Rust facts",
  };

  override interactive = true;
  override userPersona =
    "When asked whether to promote the answer to a top-level concept page, reply: 'no'.";

  userQuery =
    "/flowai-skill-memex-ask What are the main features of the Tokio Rust async runtime?";

  checklist = [
    {
      id: "honest_admission",
      description:
        "Did the agent explicitly say the memex does NOT cover Rust / Tokio / async runtimes (instead of synthesising from training data)?",
      critical: true,
    },
    {
      id: "no_rust_fabrication",
      description:
        "Did the agent AVOID listing specific Tokio features (work-stealing scheduler, async/await, etc.) that are not present in the fixture memex?",
      critical: true,
    },
    {
      id: "suggests_save",
      description:
        "Did the agent suggest running `flowai-skill-memex-save` (or equivalent) to add Rust/Tokio sources to fill the gap?",
      critical: true,
    },
    {
      id: "answer_file_created",
      description:
        "Was a markdown file created in `pages/answers/` for this question (so the gap is recorded)?",
      critical: true,
    },
    {
      id: "answer_file_status_gap",
      description:
        "Does the answer file frontmatter use `status: gap` (not `status: filed`)?",
      critical: false,
    },
    {
      id: "log_appended",
      description:
        "Was `log.md` appended with an ask entry that mentions the gap?",
      critical: false,
    },
    {
      id: "no_external_fetch",
      description:
        "Did the agent refrain from running WebFetch / WebSearch to fill the gap silently?",
      critical: true,
    },
  ];
}();
