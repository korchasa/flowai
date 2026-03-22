import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const SetupCodeStyleTsStrictBasicBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-setup-agent-code-style-ts-strict-basic";
  name = "Inject TypeScript strict mode code style rules into AGENTS.md";
  skill = "flow-setup-agent-code-style-ts-strict";

  userQuery =
    "/flow-setup-agent-code-style-ts-strict Add TypeScript strict mode code style rules to this project.";

  checklist = [
    {
      id: "code_style_section_added",
      description:
        'Does AGENTS.md now contain a "Code Style (TypeScript Strict Mode)" section or equivalent strict TS heading?',
      critical: true,
    },
    {
      id: "injection_location_correct",
      description:
        'Is the code style section placed after "Project tooling Stack" and before "Architecture" in AGENTS.md?',
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "strict_mode_rule",
      description:
        "Does the injected content include the strict mode requirement (strict: true)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "avoid_any_rule",
      description:
        'Does the injected content include the rule to avoid "any" and use "unknown" for truly unknown types?',
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "testing_guidelines",
      description:
        "Does the injected content include testing guidelines (Given-When-Then naming, test pyramid, coverage target)?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "immutability_rule",
      description:
        "Does the injected content mention immutability enforcement (readonly, Readonly<T>)?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "no_duplicate_sections",
      description:
        'Is there only one "Code Style" section in AGENTS.md (no duplicates)?',
      critical: true,
    },
    {
      id: "existing_content_preserved",
      description:
        "Are the original AGENTS.md sections (Project tooling Stack, Architecture) still present and unmodified?",
      critical: true,
      type: "semantic" as const,
    },
  ];
}();
