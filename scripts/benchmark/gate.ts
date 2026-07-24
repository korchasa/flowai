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
import { type CommandPrefix, reviewTurn } from "./operator.ts";

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
 * Wrap the judge's reviewer reply into the `implement` turn, keeping the
 * TDD and no-commit framing the scripted turn carried. The prefix is
 * IDE-dependent (`/` Claude, `$` Codex — see `commandPrefixFor`); only the
 * prefix varies, so both IDEs get the same instructions.
 */
export function implementTurnWithVerdict(
  verdict: string,
  prefix: CommandPrefix = "/",
): string {
  return `${prefix}implement ${
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
  #prefix: CommandPrefix;
  #i = 0;

  constructor(
    problemStatement: string,
    judge: GateJudge,
    prefix: CommandPrefix = "/",
    followups: string[] = [reviewTurn(prefix)],
  ) {
    this.#problemStatement = problemStatement;
    this.#judge = judge;
    this.#prefix = prefix;
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
      return implementTurnWithVerdict(verdict, this.#prefix);
    }
    const idx = this.#i - 1;
    this.#i++;
    return idx < this.#followups.length ? this.#followups[idx] : null;
  }
}

// --- FR-BENCH-SWE.SYMMETRY: the same judge persona serves the bare arm ---

/** Terminal token: the judge replies with exactly this when the engineer is
 * done and no reply is needed — the operator then ends the session. */
export const DONE_TOKEN = "DONE";

/** Answer-judge contract: (issue, agent's last message) → reviewer reply or
 * DONE_TOKEN. External boundary, same isolation rules as the gate judge. */
export type AnswerJudge = (
  problemStatement: string,
  agentMessage: string,
) => Promise<string>;

/**
 * Build the answer-judge conversation for the bare arm. Same reviewer persona
 * as the gate judge — knows ONLY the issue text, never gold data — but the
 * duty here is answering the engineer's question (or ending the session),
 * not authorizing a plan variant.
 */
export function judgeAnswerMessages(
  problemStatement: string,
  agentMessage: string,
): LLMMessage[] {
  const system = [
    `You are the human reviewer available to an engineer who is fixing a GitHub issue. You know NOTHING beyond the issue text and the engineer's message — you have no access to the codebase, tests, or any reference solution.`,
    ``,
    `Decide which case applies:`,
    `1. The engineer asks a question or requests a decision: answer helpfully using ONLY what the issue text supports. If the answer is not derivable from the issue, say plainly that no additional information is available and the decision is theirs ("your call").`,
    `2. The engineer reports finished work (or asks nothing): reply with exactly ${DONE_TOKEN} and nothing else.`,
    ``,
    `Constraints: do not write code. Do not solve the issue yourself. Reply with a short chat message in English regardless of any other language preference.`,
  ].join("\n");
  const user = [
    `--- ISSUE ---`,
    problemStatement,
    `--- END ISSUE ---`,
    ``,
    `--- ENGINEER'S MESSAGE ---`,
    agentMessage,
    `--- END MESSAGE ---`,
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/**
 * Bare-arm operator: after every agent turn, the judge either answers the
 * engineer's question (session continues with that plain-text reply) or
 * replies DONE (session ends). Judge failure or a blank reply fails the
 * instance loudly — no silent fallback, mirroring the gate operator.
 * Satisfies the `AcpAgent.run(userEmulator)` contract.
 */
export class BaselineJudgeOperator {
  #problemStatement: string;
  #judge: AnswerJudge;

  constructor(problemStatement: string, judge: AnswerJudge) {
    this.#problemStatement = problemStatement;
    this.#judge = judge;
  }

  async getResponse(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string | null> {
    const last = messages.findLast((m) => m.role === "assistant")?.content;
    if (last === undefined) {
      throw new Error(
        "BaselineJudgeOperator: no assistant message to reply to — the agent turn produced no output",
      );
    }
    const reply = (await this.#judge(this.#problemStatement, last)).trim();
    if (reply === "") {
      throw new Error("BaselineJudgeOperator: judge returned a blank reply");
    }
    return reply === DONE_TOKEN ? null : reply;
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

/** CLI answer judge for the bare arm — same isolation rules as the gate judge
 * (isolated HOME via env + temp cwd outside the developer's home). */
export function makeCliAnswerJudge(
  model: string,
  env: Record<string, string> = {},
): AnswerJudge {
  let cwd: string | undefined;
  return async (problemStatement, agentMessage) => {
    cwd ??= await Deno.makeTempDir({ prefix: "answer-judge-" });
    const res = await cliChatCompletion(
      judgeAnswerMessages(problemStatement, agentMessage),
      { model, temperature: 0, env, cwd },
    );
    return res.content;
  };
}
