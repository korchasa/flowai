import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * The page to rewrite is written into the sandbox by `setup`, and the query
 * names its path. Until 2026-08-20 the query said "rewrite this product page"
 * and no page existed anywhere, so all three runs ended `blocked` with "Please
 * paste the text you'd like rewritten". The scenario was then briefly recorded
 * as an unreachable positive trigger, with an evidence line claiming the agent
 * "rewrites the text on the spot" — the opposite of what the session says. The
 * count of tool calls came from the summary table; the session was never opened.
 */
export const WriteInInformationalStyleTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "write-in-informational-style-trigger-pos-1";
  name = "rewrite marketing copy as neutral";
  skill = "write-in-informational-style";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  override async setup(sandboxPath: string) {
    await Deno.writeTextFile(
      `${sandboxPath}/product-page.md`,
      [
        "# Orbit Sync — Effortless Backups That Just Work",
        "",
        "Orbit Sync is the world's most powerful backup companion, trusted by",
        "thousands of happy teams who never worry about their data again. Our",
        "revolutionary engine works its magic in the background, so you can",
        "focus on what really matters.",
        "",
        "## Why teams love Orbit Sync",
        "",
        "- Blazing-fast incremental snapshots, every 15 minutes.",
        "- Rock-solid encryption that keeps prying eyes out (AES-256).",
        "- Seamless restore in just a couple of clicks.",
        "- Unbeatable value starting at $4 per seat per month.",
        "",
        "Stop losing sleep over lost files. Join the backup revolution today.",
        "",
      ].join("\n"),
    );
  }

  userQuery =
    "Rewrite product-page.md so it reads as a neutral informational article — no marketing tone, no superlatives, just factual prose. Keep the numbers.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `write-in-informational-style` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `write-in-informational-style`.",
    critical: true,
  }];
}();
