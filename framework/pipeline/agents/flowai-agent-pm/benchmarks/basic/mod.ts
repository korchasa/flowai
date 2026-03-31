import { BenchmarkAgentScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests that flowai-agent-pm produces a valid specification artifact
 * from provided issue data, following the required structure:
 * YAML frontmatter (issue, scope) + Problem Statement + Affected Requirements
 * + Scope Boundaries + Summary.
 */
export const AgentPmBasicBench = new class extends BenchmarkAgentScenario {
  id = "flowai-agent-pm-basic";
  name = "PM Produces Valid Specification from Issue Data";
  agent = "flowai-agent-pm";
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override async setup(sandboxPath: string) {
    const nodeDir = join(sandboxPath, ".flow", "runs", "test", "specification");
    await Deno.mkdir(nodeDir, { recursive: true });

    // Create flowai-shared-rules and flowai-reflection-protocol for the agent to read
    const agentsDir = join(sandboxPath, ".claude", "agents");
    await Deno.mkdir(agentsDir, { recursive: true });

    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      `export function processData(input: string): string {
  return input.toUpperCase();
}
`,
    );
  }

  userQuery = `You are the PM agent. Your task:
    - Read flowai-shared-rules and flowai-reflection-protocol from the agents directory
    - Issue data:
      Title: "Add caching layer for processData function"
      Body: "The processData function is called frequently and is slow. We need to add an in-memory cache to speed things up. Cache should expire after 5 minutes."
      Labels: ["enhancement", "priority: high"]
    - Write specification artifact to: .flow/runs/test/specification/01-spec.md
    - Node output directory: .flow/runs/test/specification/
    - Run ID: test
    - Issue number: 42
    Follow your agent definition for exact steps.`;

  checklist = [
    {
      id: "spec_created",
      description:
        "Did the agent create 01-spec.md in .flow/runs/test/specification/?",
      critical: true,
    },
    {
      id: "yaml_frontmatter",
      description:
        "Does 01-spec.md start with YAML frontmatter containing 'issue: 42' and a 'scope' field?",
      critical: true,
    },
    {
      id: "problem_statement",
      description: "Does 01-spec.md contain a '## Problem Statement' section?",
      critical: true,
    },
    {
      id: "scope_boundaries",
      description: "Does 01-spec.md contain a '## Scope Boundaries' section?",
      critical: true,
    },
    {
      id: "summary_section",
      description: "Does 01-spec.md contain a '## Summary' section?",
      critical: true,
    },
    {
      id: "no_implementation_details",
      description:
        "Does the spec avoid implementation details (no code, no data structures, no API definitions)?",
      critical: false,
    },
  ];
}();
