import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerRuleConditionalBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-engineer-rule-conditional";
  name = "Create a conditional TypeScript error handling rule";
  skill = "flowai-skill-engineer-rule";
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "/flowai-skill-engineer-rule Create a rule that enforces typed error handling in TypeScript files: always use custom error classes, never catch without re-throwing or logging, and always include error context. This should only apply to .ts files.";

  checklist = [
    {
      id: "detects_ide",
      description:
        "Did the agent detect the target IDE (via .claude/ directory) or ask the user which IDE to target?",
      critical: true,
    },
    {
      id: "correct_file_location",
      description:
        "Did the agent create the rule file in a correct IDE-specific location (e.g., .claude/rules/*.md, .cursor/rules/*/RULE.md)?",
      critical: true,
    },
    {
      id: "has_frontmatter",
      description:
        "Does the rule file have valid YAML frontmatter with the correct fields for the detected IDE? For Claude Code: 'paths' (array of globs, optional 'description'; 'globs'/'alwaysApply' are Cursor-specific and must NOT be used). For Cursor: 'description', 'globs', 'alwaysApply'.",
      critical: true,
    },
    {
      id: "conditional_scope",
      description:
        "Is the rule scoped to TypeScript files using the correct IDE-specific field? For Claude Code: paths: ['**/*.ts']. For Cursor: globs: '**/*.ts', alwaysApply: false.",
      critical: true,
    },
    {
      id: "includes_code_examples",
      description:
        "Does the rule include concrete code examples showing good and bad error handling patterns?",
      critical: true,
    },
    {
      id: "concise_content",
      description:
        "Is the rule content concise and actionable (under 500 lines, preferably under 50)?",
      critical: false,
    },
  ];

  override setup(sandboxDir: string): Promise<void> {
    // Create .claude directory marker so agent can detect Claude Code
    Deno.mkdirSync(`${sandboxDir}/.claude`, { recursive: true });
    return Promise.resolve();
  }
}();
