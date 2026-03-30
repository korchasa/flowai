#!/usr/bin/env -S deno run --allow-run

/**
 * Check for a human reply to a HITL question on a GitHub Issue.
 * Usage: deno run --allow-run hitl-check.ts <issue_number> <question_timestamp>
 * Exit 0 + stdout = reply text found. Exit 1 = no reply yet.
 */

function usage(): never {
  console.error(
    "Usage: hitl-check.ts <issue_number> <question_timestamp>",
  );
  Deno.exit(1);
}

if (import.meta.main) {
  const issueNumber = Deno.args[0];
  const questionTs = Deno.args[1];
  if (!issueNumber || !questionTs) usage();

  // Validate timestamp format (ISO 8601)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(questionTs)) {
    console.error(
      "Invalid timestamp format. Expected: YYYY-MM-DDTHH:MM:SSZ",
    );
    Deno.exit(1);
  }

  if (!/^\d+$/.test(issueNumber)) {
    console.error("Invalid issue number. Must be numeric.");
    Deno.exit(1);
  }

  // Get repo info
  const repoCmd = new Deno.Command("gh", {
    args: ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
    stdout: "piped",
    stderr: "piped",
  });
  const repoOutput = await repoCmd.output();
  const repo = new TextDecoder().decode(repoOutput.stdout).trim();
  if (!repo) {
    console.error("Cannot determine repository");
    Deno.exit(1);
  }

  // Get current authenticated user to exclude self-comments
  const selfCmd = new Deno.Command("gh", {
    args: ["api", "user", "--jq", ".login"],
    stdout: "piped",
    stderr: "piped",
  });
  const selfOutput = await selfCmd.output();
  const self = new TextDecoder().decode(selfOutput.stdout).trim();

  // Fetch comments via gh api
  const jqFilter = [
    "[.[]",
    `| select(.created_at > "${questionTs}")`,
    '| select(.user.type != "Bot")',
    '| select(.body | startswith("**HITL Question:**") | not)',
    ...(self ? [`| select(.user.login != "${self}")`] : []),
    "] | last | .body // empty",
  ].join(" ");

  const apiCmd = new Deno.Command("gh", {
    args: [
      "api",
      `repos/${repo}/issues/${issueNumber}/comments`,
      "--jq",
      jqFilter,
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const apiOutput = await apiCmd.output();
  const reply = new TextDecoder().decode(apiOutput.stdout).trim();

  if (!reply) {
    Deno.exit(1);
  }

  console.log(reply);
}
