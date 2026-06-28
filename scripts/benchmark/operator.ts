/**
 * Operator-driven flowai arm for the SWE-bench benchmark (FR-BENCH-SWE).
 *
 * The flowai arm is NOT a single self-describing prompt — that never invoked the
 * skills (transcripts showed 0 `Skill` tool calls). Instead a deterministic
 * operator plays the human, issuing the workflow as SEPARATE commands across
 * turns: turn 1 `/plan` (with the issue), then `/implement`, then `/review`.
 *
 * `ScriptedOperator` satisfies the `AcpAgent.run(userEmulator?)` contract
 * (`getResponse(messages) => Promise<string | null>`): it returns the next
 * scripted turn regardless of conversation content, then null to end the run.
 */

/** Shared task framing: repo + issue + autonomy + no-commit. */
export function baseTask(repo: string, problemStatement: string): string {
  return [
    `You are in a checkout of the ${repo} repository at a specific commit.`,
    `Resolve the following GitHub issue by editing the source so the project's tests pass.`,
    `Work fully autonomously: there is no user to consult — make every decision yourself and never stop to ask.`,
    `Do not commit or push; leave your fix in the working tree.`,
    ``,
    `--- ISSUE ---`,
    problemStatement,
    `--- END ISSUE ---`,
  ].join("\n");
}

/**
 * A slash turn MUST be `/<name> <args…>` with a SPACE right after the command
 * name — never a newline. The Claude Agent SDK slash parser (`cQ4` in cli.js)
 * extracts the command name as `text.slice(1).split(" ")[0]`, i.e. everything up
 * to the FIRST space. A `/plan\n\n…` turn yields the name `"plan\n\n…"`, which
 * fails the SDK's name validation (`byY`: only `[A-Za-z0-9:_-]`) so the slash is
 * NOT resolved and the whole turn reaches the model as plain text — the skill
 * never fires (observed: 0 skill activations). The space separator keeps the
 * name a clean token; the args may then contain newlines freely.
 */
function slashTurn(name: string, args: string): string {
  return `/${name} ${args}`;
}

/**
 * Turn 1: a `/plan` invocation carrying the issue ONLY — the implement/review
 * steps are deliberately withheld and delivered later by the operator, so the
 * agent runs the plan skill first instead of front-loading the whole workflow.
 */
export function planTurn(repo: string, problemStatement: string): string {
  return slashTurn("plan", baseTask(repo, problemStatement));
}

/** Follow-up turn: run the implement skill under TDD. */
export function implementTurn(): string {
  return slashTurn(
    "implement",
    [
      `Implement the selected plan under TDD (red → green → refactor → check).`,
      `Work autonomously; never stop to ask. Do not commit or push.`,
    ].join("\n"),
  );
}

/** Follow-up turn: run the review skill over the working-tree diff. */
export function reviewTurn(): string {
  return slashTurn(
    "review",
    [
      `Review your working-tree diff for correctness AND completeness against the issue;`,
      `fix any gaps you find. Work autonomously. Do not commit or push.`,
    ].join("\n"),
  );
}

/**
 * Deterministic operator: replays a fixed list of follow-up turns, one per
 * `getResponse` call, then null. Ignores conversation content for reproducibility.
 */
export class ScriptedOperator {
  #turns: string[];
  #i = 0;

  constructor(turns: string[]) {
    this.#turns = turns;
  }

  getResponse(
    _messages: Array<{ role: string; content: string }>,
  ): Promise<string | null> {
    const turn = this.#i < this.#turns.length ? this.#turns[this.#i] : null;
    this.#i++;
    return Promise.resolve(turn);
  }
}
