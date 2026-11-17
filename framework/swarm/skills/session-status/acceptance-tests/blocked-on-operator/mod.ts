import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

const DEPLOY_SH = `#!/bin/sh
# Uploads the built site. Needs DEPLOY_TOKEN in the environment.
: "\${DEPLOY_TOKEN:?DEPLOY_TOKEN is not set}"
echo "uploading with token"
`;

const TASK_MD = `---
date: 2026-11-10
status: to do
---
# Deploy the site with the new token

## Goal

The old deploy token expires this week; the site must be deployed with a new one.

## Definition of Done

- [ ] The deploy script runs with the new token
  - Evidence: \`sh deploy.sh\` prints "uploading with token"
- [ ] The old token is revoked
  - Evidence: manual — operator

## Solution

Get the new token from the operator, run the deploy, ask the operator to revoke the old token.
`;

/**
 * A session that cannot go on without the operator: only the operator can
 * issue the token. The skill must record `blocked on operator` and what
 * exactly is needed, and the report must open with that — not with a story of
 * what was tried. It must not invent a token or run the deploy.
 */
export const SessionStatusBlockedOnOperator = new class
  extends AcceptanceTestScenario {
  id = "session-status-blocked-on-operator";
  name = "Records a session that waits for the operator";
  skill = "session-status";
  maxSteps = 25;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Site",
    TOOLING_STACK: "- POSIX shell",
  };

  override async setup(sandboxPath: string) {
    const taskDir = `${sandboxPath}/documents/tasks/2026/11`;
    await Deno.mkdir(taskDir, { recursive: true });
    await Deno.writeTextFile(`${sandboxPath}/deploy.sh`, DEPLOY_SH);
    await Deno.writeTextFile(`${taskDir}/deploy-new-token.md`, TASK_MD);
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "chore: add deploy script"]);
  }

  userQuery =
    "/session-status This session works on documents/tasks/2026/11/deploy-new-token.md. It cannot go on: the deploy needs the new production deploy token, and only I can issue it — you have not received it yet. Nothing is running in the background. Record the status of the session and report it.";

  checklist = [
    {
      id: "state_blocked_on_operator",
      description:
        "Does the `## Status` section of documents/tasks/2026/11/deploy-new-token.md carry the state `blocked on operator` (that exact state, not `working` and not `failed`)?",
      critical: true,
    },
    {
      id: "need_named_in_file",
      description:
        "Does the `## Status` section say what is needed from the operator — the new production deploy token?",
      critical: true,
    },
    {
      id: "report_opens_with_state_and_need",
      description:
        "Does the agent's final message BEGIN with the state `blocked on operator` on its first line and the request for the new deploy token on its second line, before anything else?",
      critical: true,
    },
    {
      id: "counts_reported",
      description:
        "Does the report say that 2 of 2 Definition-of-Done items are left?",
      critical: false,
    },
    {
      id: "no_work_done",
      description:
        "Did the agent refrain from doing the task itself — it did not run deploy.sh with an invented token, did not tick a checkbox, and edited no file other than the task file?",
      critical: true,
    },
  ];
}();
