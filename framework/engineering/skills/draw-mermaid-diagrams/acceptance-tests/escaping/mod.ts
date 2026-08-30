import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Does the produced diagram actually render?
 *
 * The first version of this scenario asked for a release pipeline whose node
 * labels carried parentheses. Both arms of an A/B — skill present, skill
 * stripped to frontmatter — scored 3/3 and all six diagrams rendered: the
 * model quotes node labels unaided, so the scenario measured nothing. It is
 * kept here as the retracted version, because "the model got it right" was a
 * true result about the wrong hazard.
 *
 * The query below reaches the hazards that version did not, each confirmed
 * fatal against the official Mermaid parser (2026-08-30, 43 probes):
 *
 *   - parentheses in an EDGE label      A -->|retry (3x)| B
 *   - parentheses in a SUBGRAPH title   subgraph Build (CI)
 *   - a literal quote inside a label    needs #quot;
 *   - a `;` in a sequence message       quoting does not help
 *
 * Measured on it 2026-08-31, three runs per arm, verdict taken from the real
 * parser rather than the judge:
 *
 *   - skill stripped to frontmatter        0 of 3 rendered
 *   - skill as it then stood               2 of 3 rendered
 *   - skill as it stands now               3 of 3 rendered
 *
 * In the middle arm all three first drafts were broken; two were repaired
 * after the check reported the error, and the third shipped broken because
 * the check — `npx @mermaid-js/mermaid-cli` at the time — blew a 120 s
 * timeout on its cold download. The check is a precondition in the skill
 * text, and a stdlib Python script rather than a network call, for those two
 * reasons respectively.
 *
 * In the last arm the check ran once per run and found nothing: every first
 * draft was already correct. So that arm measures the rewritten hazard
 * reference, not the checker's repair loop — the repair loop is what the
 * middle arm measured.
 *
 * The query says nothing about quoting or escaping: the remedy is what is
 * being measured, so naming it would be test-fitting.
 */
export const DrawMermaidEscapingBench = new class
  extends AcceptanceTestScenario {
  id = "draw-mermaid-diagrams-escaping";
  name = "A diagram whose labels carry brackets and punctuation still renders";
  skill = "draw-mermaid-diagrams";
  agentsTemplateVars = { PROJECT_NAME: "DeployPipeline" };

  userQuery = "Write docs/deploy.md with two Mermaid diagrams of our deploy. " +
    "First a flowchart, grouped into two boxes titled Build (CI) and " +
    "Release (CD). Inside Build (CI): compile, then unit tests, and the arrow " +
    "from compile to unit tests is labelled retry (3x). Inside Release (CD): " +
    "canary, then full rollout, and the arrow between them is labelled " +
    'wait (10 min). Add a note node whose text is: the runbook says "never ' +
    'skip the canary". ' +
    "Second a sequence diagram between Deployer, Gateway and Registry, with " +
    "these three messages, worded exactly: " +
    "Deployer to Gateway: drain connections; wait for idle. " +
    "Gateway to Registry: pull image (sha256 digest). " +
    "Registry to Gateway: image ready; checksum ok.";

  checklist = [
    {
      id: "both_diagrams_saved",
      description:
        "Does docs/deploy.md hold two ```mermaid blocks — a flowchart and a sequenceDiagram?",
      critical: true,
    },
    {
      id: "validation_run_clean",
      description:
        "Did the agent run the skill's checker (`python3 .../validate.py docs/deploy.md`) on the file it wrote, and was its LAST run clean (exit 0 / no problems reported)? A run that reported problems must be followed by a fix and another run. Fail this item if the checker was never run, or if its last run still reported problems.",
      critical: true,
    },
    {
      id: "no_unquoted_brackets",
      description:
        'Every label carrying a bracket — node labels, the two edge labels `retry (3x)` and `wait (10 min)`, and the two subgraph titles `Build (CI)` and `Release (CD)` — must be wrapped in double quotes, e.g. `A -->|"retry (3x)"| B` and `subgraph CI ["Build (CI)"]`. Unquoted brackets in label text are a Mermaid parse error. Fail this item if any of them is unquoted.',
      critical: true,
    },
    {
      id: "no_bare_semicolon_in_messages",
      description:
        "The two sequence messages containing a semicolon (`drain connections; wait for idle` and `image ready; checksum ok`) must not carry a bare `;` — it ends the statement and quoting does not help. Either `#semi;` or a reworded message is acceptable. Fail this item if a bare `;` survives in a sequence message.",
      critical: true,
    },
    {
      id: "wording_preserved",
      description:
        "Do the labels and messages carry the wording the user gave, rather than a paraphrase that dodges the punctuation?",
      critical: false,
    },
  ];
}();
