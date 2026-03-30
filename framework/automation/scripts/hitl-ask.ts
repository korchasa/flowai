#!/usr/bin/env -S deno run --allow-run

/**
 * Post a HITL question to a GitHub Issue comment.
 * Usage: deno run --allow-run hitl-ask.ts <issue_number> <question_text>
 * Outputs: ISO timestamp of the posted comment.
 */

function usage(): never {
  console.error("Usage: hitl-ask.ts <issue_number> <question_text>");
  Deno.exit(1);
}

if (import.meta.main) {
  const issueNumber = Deno.args[0];
  const question = Deno.args[1];
  if (!issueNumber || !question) usage();

  if (!/^\d+$/.test(issueNumber)) {
    console.error("Invalid issue number. Must be numeric.");
    Deno.exit(1);
  }

  const body =
    `**HITL Question:**\n\n${question}\n\n---\n_Reply to this comment to answer._`;

  const cmd = new Deno.Command("gh", {
    args: ["issue", "comment", issueNumber, "--body", body],
    stdout: "piped",
    stderr: "piped",
  });

  const output = await cmd.output();
  if (output.code !== 0) {
    const stderr = new TextDecoder().decode(output.stderr);
    console.error(`Failed to post comment: ${stderr}`);
    Deno.exit(1);
  }

  // Output current UTC timestamp for subsequent polling
  console.log(new Date().toISOString().replace(/\.\d{3}Z$/, "Z"));
}
