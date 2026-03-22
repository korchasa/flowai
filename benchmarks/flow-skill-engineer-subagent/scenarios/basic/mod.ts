import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const EngineerSubagentBasicBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-skill-engineer-subagent-basic";
  name = "Create a code reviewer subagent for a Claude Code project";
  skill = "flow-skill-engineer-subagent";

  userQuery =
    "/flow-skill-engineer-subagent Create a subagent that acts as a security-focused code reviewer. It should proactively check for hardcoded secrets, SQL injection, XSS vulnerabilities, and insecure dependencies. This is a Claude Code project, place it at project level.";

  checklist = [
    {
      id: "detects_ide",
      description:
        "Did the agent detect Claude Code as the target IDE (via .claude/ directory) or acknowledge the user's specification?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "correct_file_location",
      description:
        "Did the agent create the subagent file in the correct location (.claude/agents/*.md)?",
      critical: true,
    },
    {
      id: "valid_frontmatter",
      description:
        "Does the subagent file have valid YAML frontmatter with name and description fields?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "description_third_person",
      description:
        "Is the description written in third person with specific trigger terms and includes WHAT + WHEN?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "focused_specialization",
      description:
        "Is the subagent focused on one specific task (security review) rather than being overly broad?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "has_workflow",
      description:
        "Does the system prompt body define a clear workflow or checklist for how the subagent should operate?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "security_concerns_covered",
      description:
        "Does the subagent address the requested security concerns (secrets, SQL injection, XSS, insecure deps)?",
      critical: false,
      type: "semantic" as const,
    },
  ];

  override setup(sandboxDir: string): Promise<void> {
    // Create .claude directory marker so agent detects Claude Code
    Deno.mkdirSync(`${sandboxDir}/.claude/agents`, { recursive: true });
    return Promise.resolve();
  }
}();
