/**
 * LLM-judged human gate for the SWE-bench flowai arm (FR-BENCH-SWE).
 *
 * The scripted operator's gate turn used to be an unconditional
 * "Go ahead with your recommended variant" — a rubber stamp. That made every
 * plan-phase quality effect invisible: a narrow or wrong plan was authorized
 * exactly like a good one (loop4 STOP-ANALYSIS, 2026-07-04). This module
 * replaces that single turn with an LLM judge playing the knowledgeable human
 * reviewer: it reads ONLY the issue and the planner's output (never gold
 * patches or FAIL_TO_PASS lists — measurement honesty), checks the plan's
 * outcome coverage against the issue, and authorizes exactly one variant,
 * optionally naming what the plan missed.
 *
 * The gate is therefore stochastic (an LLM turn) — recorded as a harness
 * property in run.ts and in every report. Judge failure fails the instance
 * loudly; there is deliberately NO fallback to the rubber stamp.
 */

import type { LLMMessage } from "@acceptance-tests/types.ts";
import { cliChatCompletion } from "@acceptance-tests/llm.ts";
import { reviewTurn } from "./operator.ts";

/** Judge contract: (issue, plan output) → reviewer reply. External boundary. */
export type GateJudge = (
  problemStatement: string,
  planOutput: string,
) => Promise<string>;

/**
 * Build the judge conversation. The system prompt frames a human reviewer at
 * the planning gate: verify outcome coverage, authorize one variant, challenge
 * evidence-free "nothing to do" conclusions. No code, no solving.
 */
export function judgeGateMessages(
  problemStatement: string,
  planOutput: string,
): LLMMessage[] {
  const system = [
    `You are the human reviewer at a planning gate. An engineer has analyzed an issue and presented a plan (variants + recommendation). You decide what happens next.`,
    ``,
    `Your review duties:`,
    `1. Coverage: compare the plan against the issue. Name anything the issue states — behaviors, cases, expected results — that the plan misses, narrows, or silently omits. A general requirement illustrated by one example covers ALL cases, not just the example.`,
    `2. Authorization: authorize exactly ONE variant — the recommendation, unless another variant clearly better matches the issue's own description of the problem.`,
    `3. No-work claims: if the plan concludes nothing needs to change, accept that only with inspected evidence that the issue's required outcome already exists; absence of the described symptom alone is not enough — say so and ask for the evidence.`,
    ``,
    `Constraints: you know NOTHING beyond the issue text and the plan. Do not write code. Do not solve the issue yourself. Reply with a short chat message to the engineer, in English regardless of any other language preference: the authorization ("Go ahead with variant N") plus any corrections ("Also cover: ..."). Nothing else.`,
  ].join("\n");
  const user = [
    `--- ISSUE ---`,
    problemStatement,
    `--- END ISSUE ---`,
    ``,
    `--- ENGINEER'S PLAN ---`,
    planOutput,
    `--- END PLAN ---`,
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/**
 * Wrap the judge's reviewer reply into the `/implement` turn, keeping the
 * TDD and no-commit framing the scripted turn carried.
 */
export function implementTurnWithVerdict(verdict: string): string {
  return `/implement ${
    [
      verdict.trim(),
      `Implement under TDD (red → green → refactor → check).`,
      `Stay in the working tree; do not commit or push. Proceed without further questions.`,
    ].join("\n")
  }`;
}

/**
 * Operator with a judged gate: turn 1 after `/plan` is the judge's verdict
 * wrapped into `/implement`, turn 2 is the scripted `/review`, then null.
 * Satisfies the `AcpAgent.run(userEmulator)` contract.
 */
export class JudgeGateOperator {
  #problemStatement: string;
  #judge: GateJudge;
  #followups: string[];
  #i = 0;

  constructor(
    problemStatement: string,
    judge: GateJudge,
    followups: string[] = [reviewTurn()],
  ) {
    this.#problemStatement = problemStatement;
    this.#judge = judge;
    this.#followups = followups;
  }

  async getResponse(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string | null> {
    if (this.#i === 0) {
      this.#i++;
      const planOutput = messages.findLast((m) => m.role === "assistant")
        ?.content;
      if (planOutput === undefined) {
        throw new Error(
          "JudgeGateOperator: no assistant message to judge — the plan turn produced no output",
        );
      }
      const verdict = await this.#judge(this.#problemStatement, planOutput);
      if (verdict.trim() === "") {
        throw new Error("JudgeGateOperator: judge returned a blank verdict");
      }
      return implementTurnWithVerdict(verdict);
    }
    const idx = this.#i - 1;
    this.#i++;
    return idx < this.#followups.length ? this.#followups[idx] : null;
  }
}

/**
 * Production judge over `claude -p` (existing CLI auth, no API key).
 *
 * Isolation is two-fold, both mandatory (verified empirically 2026-07-04):
 * - `env` carries the bench's isolated `HOME` (the adapter's `prepareWorkspace`
 *   bench-home) so the developer's `~/.claude/CLAUDE.md` user memory does not
 *   load;
 * - the judge runs from a temp cwd OUTSIDE the developer's home, because
 *   ancestor-directory memory files (`CLAUDE.md`/`AGENTS.md` up the cwd path,
 *   e.g. `~/AGENTS.md`) load regardless of `HOME` and their preferences leak
 *   into the verdict (observed: a personal "reply in Russian" rule reached the
 *   bench agent mid-pipeline).
 */
export function makeCliGateJudge(
  model: string,
  env: Record<string, string> = {},
): GateJudge {
  let cwd: string | undefined;
  return async (problemStatement, planOutput) => {
    cwd ??= await Deno.makeTempDir({ prefix: "gate-judge-" });
    const res = await cliChatCompletion(
      judgeGateMessages(problemStatement, planOutput),
      { model, temperature: 0, env, cwd },
    );
    return res.content;
  };
}
