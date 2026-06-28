/**
 * Operator-driven flowai arm for the SWE-bench benchmark (FR-BENCH-SWE).
 *
 * The flowai arm is NOT a single self-describing prompt — that never invoked the
 * skills (transcripts showed 0 `Skill` tool calls). Instead a deterministic
 * operator plays the human, issuing the workflow as SEPARATE commands across
 * turns: turn 1 `/plan` (with the issue), then `/implement`, then `/review`.
 *
 * The operator also EMULATES THE HUMAN ON THE DECISION GATE. flowai's value is a
 * human who reviews variants before code; a "make every decision yourself, never
 * stop to ask" prompt nullifies that — the plan skill's gate becomes a no-op and
 * the agent codes during planning (observed on django-14792: `/plan` edited
 * source, skipped the task file and variants). So the flowai turns keep the
 * human gate: `/plan` is planner-only (variants + recommendation, NO source
 * edits, then stop), and the NEXT operator turn plays the human authorizing
 * implementation. The "never stop / decide yourself" autonomy line is confined
 * to the baseline arm (`baselineTask`), which is genuinely single-shot.
 *
 * `ScriptedOperator` satisfies the `AcpAgent.run(userEmulator?)` contract
 * (`getResponse(messages) => Promise<string | null>`): it returns the next
 * scripted turn regardless of conversation content, then null to end the run.
 */

/** Shared task framing: repo + issue + no-commit. Arm-specific autonomy/gate
 * wording is added by the per-arm turn builders, NOT here. */
export function baseTask(repo: string, problemStatement: string): string {
  return [
    `You are in a checkout of the ${repo} repository at a specific commit.`,
    `Resolve the following GitHub issue by editing the source so the project's tests pass.`,
    `Do not commit or push; leave your fix in the working tree.`,
    ``,
    `--- ISSUE ---`,
    problemStatement,
    `--- END ISSUE ---`,
  ].join("\n");
}

/**
 * Baseline arm prompt: one autonomous turn. The baseline has no workflow and no
 * human, so it IS told to decide everything itself and not stop — the exact
 * wording the flowai arm must avoid (it would collapse the plan gate).
 */
export function baselineTask(repo: string, problemStatement: string): string {
  return [
    baseTask(repo, problemStatement),
    ``,
    `Work fully autonomously: there is no user to consult — make every decision yourself and never stop to ask.`,
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
 * Turn 1: a `/plan` invocation carrying the issue. Planner-only — the operator
 * plays the human gate, so the agent must produce variants + a recommendation
 * and STOP without editing source; the implement/review steps arrive later. This
 * keeps `/plan` from collapsing into ad-hoc coding (the django-14792 failure).
 */
export function planTurn(repo: string, problemStatement: string): string {
  return slashTurn(
    "plan",
    [
      baseTask(repo, problemStatement),
      ``,
      `Act as the planner only: follow the plan skill in full — create the task file and present the implementation variants with your recommendation.`,
      `Do NOT modify any source or test files in this planning step.`,
      `A reviewer (me) decides; stop after planning and wait for my go-ahead.`,
    ].join("\n"),
  );
}

/** Follow-up turn: the human authorizes the recommended variant; run implement. */
export function implementTurn(): string {
  return slashTurn(
    "implement",
    [
      `Go ahead with your recommended variant. Implement it under TDD (red → green → refactor → check).`,
      `Stay in the working tree; do not commit or push. Proceed without further questions.`,
    ].join("\n"),
  );
}

/** Follow-up turn: run the review skill over the working-tree diff. */
export function reviewTurn(): string {
  return slashTurn(
    "review",
    [
      `Review your working-tree diff for correctness AND completeness against the issue;`,
      `fix any gaps you find. Do not commit or push. Proceed without further questions.`,
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
