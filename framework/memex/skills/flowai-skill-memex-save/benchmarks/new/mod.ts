import { BenchmarkSkillScenario } from "@bench/types.ts";

/**
 * Save in an empty directory MUST scaffold the memex AND integrate the source.
 * Atomic save: one source touches multiple memex pages.
 */
export const MemexSaveNewBench = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-save-new";
  name = "Save scaffolds new memex + integrates first source";
  skill = "flowai-skill-memex-save";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "MemexSandbox",
    TOOLING_STACK: "- Markdown",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent scaffolds memex structure, stores source in raw/, creates source-summary + entity pages, builds pages/index.md and log.md",
  };

  userQuery =
    "/flowai-skill-memex-save source.md — please add this article to my memex";

  checklist = [
    {
      id: "pages_dir_created",
      description: "Was a `pages/` directory created in the working directory?",
      critical: true,
    },
    {
      id: "agents_md_present",
      description:
        "Was an `AGENTS.md` (or equivalent schema file) created at the memex root with entity templates and conventions?",
      critical: true,
    },
    {
      id: "raw_source_saved",
      description:
        "Was the source stored in `raw/articles/` with a date-prefixed slug filename (YYYY-MM-DD-*.md) and YAML frontmatter?",
      critical: true,
    },
    {
      id: "raw_immutable",
      description:
        "Was the original `source.md` left untouched (raw is immutable — only copied/extracted from)?",
      critical: false,
    },
    {
      id: "source_summary_page",
      description:
        "Is there a memex page with `type: source-summary` frontmatter that summarises the article?",
      critical: true,
    },
    {
      id: "entity_pages_created",
      description:
        "Are there at least two entity pages in `pages/` (e.g., `john-gruber.md`, `aaron-swartz.md`, or `markdown.md`) with `type: person` or `type: concept` frontmatter?",
      critical: true,
    },
    {
      id: "wikilinks_used",
      description:
        "Do the entity pages reference each other and/or the source-summary page using `[[wikilinks]]` (not plain markdown links)?",
      critical: true,
    },
    {
      id: "index_populated",
      description:
        "Does `pages/index.md` exist with at least one entry pointing to a created page?",
      critical: true,
    },
    {
      id: "log_appended",
      description:
        "Does `log.md` exist with an entry of the form `## [YYYY-MM-DD] save | ...`?",
      critical: true,
    },
    {
      id: "no_fabrication",
      description:
        "Did the agent extract only information present in the source (no fabricated dates, names, or claims)?",
      critical: false,
    },
  ];
}();
