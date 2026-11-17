import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

const STRINGS_PY = `def slugify(text):
    """Lower-case the text and join its words with dashes."""
    return "-".join(text.lower().split())
`;

const TEST_PY = `import unittest

from strings import slugify


class SlugifyTest(unittest.TestCase):
    def test_words_joined_with_dashes(self):
        self.assertEqual(slugify("Hello Big World"), "hello-big-world")


if __name__ == "__main__":
    unittest.main()
`;

const README_MD = `# Strings

Small string helpers.
`;

const TASK_MD = `---
date: 2026-11-10
status: in progress
---
# Add a slugify helper

## Goal

Page titles need a URL-safe form, so links stay readable.

## Definition of Done

- [x] \`strings.py\` has \`slugify\`
  - Evidence: \`grep -q "def slugify" strings.py\`
- [x] \`test_strings.py\` covers \`slugify\` and passes
  - Evidence: \`python3 -m unittest test_strings\`
- [ ] \`README.md\` has a section that documents \`slugify\`
  - Evidence: \`grep -q "slugify" README.md\`

## Solution

Add the helper, its test and a README section.

## Follow-ups
`;

/**
 * A session in the middle of its task is asked to write its state down. Two of
 * three Definition-of-Done items are delivered, one claim was never checked
 * (non-Latin input) and one thing was noticed for later. The skill must write
 * a `## Status` block into the task file, record the follow-up there, and open
 * its report with the state, the operator's part and the counts. Everything is
 * committed in `setup`, so any diff is the agent's.
 */
export const SessionStatusWritesStatusBlock = new class
  extends AcceptanceTestScenario {
  id = "session-status-writes-status-block";
  name = "Writes the Status block and opens the report with three lines";
  skill = "session-status";
  maxSteps = 25;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Strings",
    TOOLING_STACK: "- Python 3",
  };

  override async setup(sandboxPath: string) {
    const taskDir = `${sandboxPath}/documents/tasks/2026/11`;
    await Deno.mkdir(taskDir, { recursive: true });
    await Deno.writeTextFile(`${sandboxPath}/strings.py`, STRINGS_PY);
    await Deno.writeTextFile(`${sandboxPath}/test_strings.py`, TEST_PY);
    await Deno.writeTextFile(`${sandboxPath}/README.md`, README_MD);
    await Deno.writeTextFile(`${taskDir}/add-slugify.md`, TASK_MD);
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "feat: add slugify helper"]);
  }

  userQuery =
    "/session-status This session works on documents/tasks/2026/11/add-slugify.md. So far: `slugify` and its test are written and the test passes. The README section is not written yet. I never tried `slugify` on non-Latin text, so that is unchecked. Along the way I noticed that strings.py has no licence header — that is for later, not for this task. Record the status of the session and report it.";

  checklist = [
    {
      id: "status_block_written",
      description:
        "Does documents/tasks/2026/11/add-slugify.md now have a `## Status` section with separate labelled lines for the state (`State:` with the value `working`), what is needed from the operator, what is not verified, the branch, and when it was updated?",
      critical: true,
    },
    {
      id: "report_opens_with_three_lines",
      description:
        "Does the agent's final message BEGIN with three short lines in this order: the state (`working`), what is needed from the operator (nothing, in this case), and the counts — 1 Definition-of-Done item left out of 3, and 1 unverified claim? Nothing else may come before them.",
      critical: true,
    },
    {
      id: "not_verified_named",
      description:
        "Is the unchecked behaviour of `slugify` on non-Latin text named as not verified, both in the `## Status` section of the task file and in the report?",
      critical: true,
    },
    {
      id: "follow_up_recorded",
      description:
        "Is the missing licence header of strings.py recorded under `## Follow-ups` in the task file?",
      critical: true,
    },
    {
      id: "left_item_reported",
      description:
        "Does the report name the README section as the item that is left, and is its Definition-of-Done checkbox still unticked?",
      critical: true,
    },
    {
      id: "only_task_file_edited",
      description:
        "Did the agent edit ONLY the task file — it did not write the README section, did not add a licence header, did not change strings.py or the test?",
      critical: true,
    },
  ];
}();
