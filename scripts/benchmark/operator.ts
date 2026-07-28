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
 * Baseline arm prompt (FR-BENCH-SWE.SYMMETRY). The arms must share ONE
 * human-availability policy: the old "make every decision yourself and never
 * stop to ask" line gave the arms different conditions beyond flowai itself.
 * Now a reviewer (the same human persona as the flowai gate) is reachable in
 * both arms — the bare agent may ask and gets an issue-text-only answer.
 */
export function baselineTask(repo: string, problemStatement: string): string {
  return [
    baseTask(repo, problemStatement),
    ``,
    `A reviewer (me) is available: if you need a decision or missing information, ask and wait for my reply. Otherwise proceed and leave your fix in the working tree.`,
  ].join("\n");
}

/**
 * How an IDE spells "invoke this installed skill with arguments".
 * `/` for Claude, `$` for Codex — see {@link commandPrefixFor}.
 */
export type CommandPrefix = "/" | "$";

/**
 * implements [FR-BENCH-SWE.IDE](../../documents/requirements.md#fr-bench-swe.ide-second-ide-under-test-codex-arm-ancfrbench-swe-ide):
 * The skill-invocation prefix is IDE-dependent, and the wrong one silently
 * disables the entire flowai arm.
 *
 * Measured on the codex ACP bridge (2026-07-24): a `/plan <args>` turn is
 * rejected outright — `Command "/plan" requires no arguments.` — so the skill
 * never runs and the arm degrades to a bare session. The documented codex form
 * `$plan <args>` fires it (transcript: "I'm using the `plan` skill because you
 * explicitly requested `$plan`", then it reads `.codex/skills/plan/SKILL.md`).
 *
 * Unknown IDEs keep the historical slash rather than guessing a new syntax.
 */
export function commandPrefixFor(ide: string): CommandPrefix {
  return ide === "codex" ? "$" : "/";
}

/**
 * A command turn MUST be `<prefix><name> <args…>` with a SPACE right after the
 * command name — never a newline. The Claude Agent SDK slash parser (`cQ4` in
 * cli.js) extracts the command name as `text.slice(1).split(" ")[0]`, i.e.
 * everything up to the FIRST space. A `/plan\n\n…` turn yields the name
 * `"plan\n\n…"`, which fails the SDK's name validation (`byY`: only
 * `[A-Za-z0-9:_-]`) so the command is NOT resolved and the whole turn reaches
 * the model as plain text — the skill never fires (observed: 0 skill
 * activations). The space separator keeps the name a clean token; the args may
 * then contain newlines freely. Only the prefix varies per IDE: the argument
 * text is identical, or the two IDEs would be measured on different prompts.
 */
function slashTurn(
  name: string,
  args: string,
  prefix: CommandPrefix = "/",
): string {
  return `${prefix}${name} ${args}`;
}

/**
 * Turn 1: a `/plan` invocation carrying the issue. Planner-only — the operator
 * plays the human gate, so the agent must produce variants + a recommendation
 * and STOP without editing source; the implement/review steps arrive later. This
 * keeps `/plan` from collapsing into ad-hoc coding (the django-14792 failure).
 */
export function planTurn(
  repo: string,
  problemStatement: string,
  prefix: CommandPrefix = "/",
): string {
  return slashTurn(
    "plan",
    [
      baseTask(repo, problemStatement),
      ``,
      `Act as the planner only: follow the plan skill in full — create the task file and present the implementation variants with your recommendation.`,
      `Do NOT modify any source or test files in this planning step.`,
      `A reviewer (me) decides; stop after planning and wait for my go-ahead.`,
    ].join("\n"),
    prefix,
  );
}

/**
 * Turn issued when the human reviewer REJECTS the plan: re-invoke the planner
 * carrying the objection.
 *
 * Before this existed, a rejection was still wrapped into the `implement` turn,
 * so the agent spent that turn re-planning and the session reached `review` with
 * an empty working tree — measured on the first flowai campaign (2026-07-27):
 * four of eleven logged sessions were rejected at the gate and three of them
 * produced no patch at all. The objection deserves its own turn.
 */
export function replanTurn(
  feedback: string,
  prefix: CommandPrefix = "/",
): string {
  return slashTurn(
    "plan",
    [
      feedback.trim(),
      ``,
      `Plan again and address the above.`,
      `Do NOT modify any source or test files in this planning step.`,
      `Present the implementation variants with your recommendation, then stop for my decision.`,
    ].join("\n"),
    prefix,
  );
}

/** Follow-up turn: run the review skill over the working-tree diff. */
export function reviewTurn(prefix: CommandPrefix = "/"): string {
  return slashTurn(
    "review",
    [
      `Review your working-tree diff for correctness AND completeness against the issue;`,
      `fix any gaps you find. Do not commit or push. Proceed without further questions.`,
    ].join("\n"),
    prefix,
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
