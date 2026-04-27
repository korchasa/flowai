import { BenchmarkSkillScenario } from "@bench/types.ts";

/**
 * Save into an EXISTING memex must:
 *  - store the new source in raw/
 *  - create new entity pages (e.g., aaron-swartz)
 *  - update existing pages with new wikilinks (backlink audit)
 *  - update pages/index.md
 *  - append log.md
 */
export const MemexSaveUpdateBench = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-save-update";
  name = "Save into existing memex updates pages and runs backlink audit";
  skill = "flowai-skill-memex-save";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "MemexSandbox",
    TOOLING_STACK: "- Markdown",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent stores new source, creates aaron-swartz entity page, runs backlink audit so john-gruber and markdown pages reference [[aaron-swartz]], updates pages/index.md and log.md",
  };

  userQuery =
    "/flowai-skill-memex-save source.md — add this to my existing memex and make sure it cross-links with what's already there";

  checklist = [
    {
      id: "raw_source_saved",
      description:
        "Was the new source stored in `raw/articles/YYYY-MM-DD-*.md` with frontmatter (date, source-url or path, title)?",
      critical: true,
    },
    {
      id: "aaron_swartz_page_created",
      description:
        "Was a new entity page for Aaron Swartz created at `pages/aaron-swartz.md` with `type: person` frontmatter?",
      critical: true,
    },
    {
      id: "source_summary_created",
      description:
        "Was a `source-summary` page created in `pages/` for the new source?",
      critical: true,
    },
    {
      id: "backlink_audit_john_gruber",
      description:
        "After adding aaron-swartz, was the existing `pages/john-gruber.md` updated to include a `[[aaron-swartz]]` wikilink?",
      critical: true,
    },
    {
      id: "backlink_audit_markdown",
      description:
        "After adding aaron-swartz, was the existing `pages/markdown.md` updated to mention `[[aaron-swartz]]` (since the source describes Swartz's contribution to Markdown)?",
      critical: true,
    },
    {
      id: "index_updated",
      description:
        "Was `pages/index.md` updated with a new entry for `[[aaron-swartz]]` (and `Last updated` bumped to today)?",
      critical: true,
    },
    {
      id: "log_appended_only",
      description:
        "Was `log.md` updated by APPENDING a new save entry (the existing 2026-04-20 entry should remain unchanged)?",
      critical: true,
    },
    {
      id: "raw_immutable",
      description: "Were existing files in `raw/` (if any) left untouched?",
      critical: false,
    },
    {
      id: "no_plain_md_links_for_internal",
      description:
        "Did the agent use `[[wikilinks]]` (not `[text](path.md)`) for ALL internal references in newly created or modified memex pages?",
      critical: false,
    },
  ];
}();
