import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Ask against a populated memex: agent should read index, open relevant
 * pages, synthesize an answer with [[wikilink]] citations, and file the
 * result to pages/answers/.
 */
export const MemexAskCitationsBench = new class extends AcceptanceTestScenario {
  id = "flowai-skill-memex-ask-citations";
  name =
    "Ask returns memex answer with [[wikilink]] citations and files result";
  skill = "flowai-skill-memex-ask";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "MemexSandbox",
    TOOLING_STACK: "- Markdown",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent reads pages/index.md, opens relevant pages, answers with [[wikilinks]] as citations, files answer to pages/answers/<slug>.md, appends log.md",
  };

  // Decline the promotion offer so the file stays in answers/ for verification.
  override interactive = true;
  override userPersona =
    "When asked whether to promote the answer to a top-level concept page, reply: 'no, keep it in answers/'.";

  userQuery =
    "/flowai-skill-memex-ask Who created Markdown and what was Aaron Swartz's role?";

  checklist = [
    {
      id: "answer_mentions_gruber",
      description:
        "Did the synthesised answer name John Gruber as the creator of Markdown?",
      critical: true,
    },
    {
      id: "answer_mentions_swartz_atx",
      description:
        "Did the answer mention Aaron Swartz's contribution of atx-style headers?",
      critical: true,
    },
    {
      id: "answer_uses_wikilinks",
      description:
        "Does the answer body include `[[wikilinks]]` as inline citations (e.g., `[[john-gruber]]`, `[[aaron-swartz]]`)?",
      critical: true,
    },
    {
      id: "answer_file_created",
      description:
        "Was a markdown file created in `pages/answers/` (filename derived from the question, e.g., `who-created-markdown-and-what-was-aaron-swartzs-role.md`)?",
      critical: true,
    },
    {
      id: "answer_file_frontmatter",
      description:
        "Does the answer file have YAML frontmatter with `type: answer`, the `question:` field, and `status: filed`?",
      critical: true,
    },
    {
      id: "answer_file_sources_section",
      description:
        "Does the answer file include a `## Sources` section listing the memex pages cited?",
      critical: false,
    },
    {
      id: "log_appended",
      description:
        "Was `log.md` appended with a `## [YYYY-MM-DD] ask | ...` entry while preserving the existing 2026-04-25 save entry?",
      critical: true,
    },
    {
      id: "no_fabrication",
      description:
        "Did the answer rely only on what the memex contains (no Markdown facts not present in the fixture pages)?",
      critical: true,
    },
  ];
}();
