import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const EngineerHookClaudeCodeBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-skill-engineer-hook-claude-code";
  name = "Create Claude Code Hook for Dangerous Command Blocking";
  skill = "flow-skill-engineer-hook";
  stepTimeoutMs = 120_000;

  userQuery =
    '/flow-skill-engineer-hook Create a hook that blocks "rm -rf" commands before they execute. This is a Claude Code project.';

  checklist = [
    {
      id: "detects_claude_code",
      description:
        "Did the agent detect or acknowledge Claude Code as the target IDE (via .claude/ directory presence)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "settings_json_format",
      description:
        "Did the agent create or show a settings.json with the correct nested Claude Code hook structure: hooks.PreToolUse[].matcher + hooks[] array?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "correct_event",
      description:
        'Did the agent use PreToolUse event with matcher "Bash" (not a Cursor event name like beforeShellExecution)?',
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "script_created",
      description:
        "Did the agent create a shell script that reads JSON from stdin and uses exit code 2 to block (Claude Code convention)?",
      critical: false,
      type: "semantic" as const,
    },
  ];

  override setup(sandboxDir: string): Promise<void> {
    // Create .claude directory marker so agent detects Claude Code
    Deno.mkdirSync(`${sandboxDir}/.claude`, { recursive: true });
    Deno.writeTextFileSync(
      `${sandboxDir}/.claude/settings.json`,
      "{}",
    );
    return Promise.resolve();
  }
}();
