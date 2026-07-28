/**
 * The LLM that plays the human for both SWE-bench arms (FR-BENCH-SWE).
 *
 * The scripted operator's gate turn used to be an unconditional
 * "Go ahead with your recommended variant" — a rubber stamp. That made every
 * plan-phase quality effect invisible: a narrow or wrong plan was authorized
 * exactly like a good one (loop4 STOP-ANALYSIS, 2026-07-04). This module
 * replaces that single turn with an LLM playing the knowledgeable human
 * reviewer: it reads ONLY the issue and the planner's output (never gold
 * patches or FAIL_TO_PASS lists — measurement honesty), checks the plan's
 * outcome coverage against the issue, and authorizes exactly one variant,
 * optionally naming what the plan missed.
 *
 * Naming: nothing here JUDGES. swebench's test run decides whether a task is
 * solved; the acceptance-test suite has its own grader. This module only
 * emulates the human on the other side of the conversation.
 *
 * The gate is therefore stochastic (an LLM turn) — recorded as a harness
 * property in run.ts and in every report. An emulator failure fails the instance
 * loudly; there is deliberately NO fallback to the rubber stamp.
 */

import type { LLMMessage } from "@acceptance-tests/types.ts";
import { cliChatCompletion } from "@acceptance-tests/llm.ts";
import { type CommandPrefix, replanTurn, reviewTurn } from "./operator.ts";

/**
 * The LLM that plays the human across turns: (issue, the agent's last output) →
 * the human's reply. External boundary.
 *
 * It is NOT a judge. Whether a task is solved is decided by swebench's own test
 * run; this emulator only supplies the human side of the conversation, and it
 * never sees gold patches or FAIL_TO_PASS lists.
 */
export type HumanEmulator = (
  problemStatement: string,
  agentOutput: string,
) => Promise<string>;

/**
 * Build the gate conversation. The system prompt frames a human reviewer at
 * the planning gate: verify outcome coverage, authorize one variant, challenge
 * evidence-free "nothing to do" conclusions. No code, no solving.
 */
export function gateMessages(
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
    `Start your reply with exactly one of these lines, and nothing else on that line:`,
    `DECISION: AUTHORIZE — the plan presents real variants for the issue and you are authorizing one.`,
    `DECISION: REPLAN — the plan is not usable and the engineer must plan again (no variants for the actual issue, an unsubstantiated "nothing to do", or the engineer stopped on their own tooling instead of analyzing the issue).`,
    `Then, on the following lines, the message itself.`,
    ``,
    `Constraints: you know NOTHING beyond the issue text and the plan. Do not write code. Do not solve the issue yourself. Reply with a short chat message to the engineer, in English regardless of any other language preference: the authorization ("Go ahead with variant N") plus any corrections ("Also cover: ..."), or what the re-plan must fix. Nothing else.`,
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
 * Wrap the emulator's reviewer reply into the `implement` turn, keeping the
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

/** What the reviewer decided at the gate, and the message carrying it. */
export interface GateVerdict {
  decision: "authorize" | "replan";
  message: string;
}

const DECISION_LINE =
  /^[^\S\n]*\**[^\S\n]*DECISION:[^\S\n]*(\w+)\**[^\S\n]*$/im;

/**
 * Split the reviewer's reply into its decision and the prose the engineer reads.
 *
 * The decision has to be machine-readable because it selects the NEXT TURN, and
 * the two outcomes need different ones. While every reply was wrapped into the
 * `implement` turn, a rejection silently ate the implementation step: on the
 * first flowai campaign four of eleven logged sessions were rejected at the gate
 * and three reached `review` with an empty working tree.
 *
 * Formatting habits of an LLM are tolerated (bold, case); an absent or unknown
 * token is not. Guessing the decision would restore exactly the ambiguity this
 * token exists to remove, so it throws — consistent with the module's no-fallback
 * rule.
 */
export function parseGateVerdict(raw: string): GateVerdict {
  const m = raw.match(DECISION_LINE);
  const word = m?.[1]?.toLowerCase();
  if (word !== "authorize" && word !== "replan") {
    throw new Error(
      `GateEmulatorOperator: the reply carries no "DECISION: AUTHORIZE|REPLAN" line — got: ${
        raw.slice(0, 120)
      }`,
    );
  }
  const message = raw.replace(m![0], "").trim();
  if (message === "") {
    throw new Error(
      "GateEmulatorOperator: the emulator decided but said nothing — a blank message leaves the engineer no instruction",
    );
  }
  return { decision: word, message };
}

/**
 * Operator with an emulated gate. After `/plan` the human either authorizes
 * (the message becomes the `/implement` turn, then the scripted `/review`, then
 * null) or rejects — and a rejection buys its OWN `/plan` turn instead of
 * spending the implementation one.
 *
 * The re-plan budget is `maxReplans` (1 by default). A reviewer who still
 * objects once it is spent sends the objection along with the `/implement` turn:
 * a session that spends every turn re-planning writes no code at all, which is
 * the failure this whole mechanism exists to prevent.
 *
 * Satisfies the `AcpAgent.run(userEmulator)` contract.
 */
export class GateEmulatorOperator {
  #problemStatement: string;
  #emulator: HumanEmulator;
  #followups: string[];
  #prefix: CommandPrefix;
  #replansLeft: number;
  #authorized = false;
  #i = 0;

  constructor(
    problemStatement: string,
    emulator: HumanEmulator,
    prefix: CommandPrefix = "/",
    followups: string[] = [reviewTurn(prefix)],
    maxReplans = 1,
  ) {
    this.#problemStatement = problemStatement;
    this.#emulator = emulator;
    this.#prefix = prefix;
    this.#followups = followups;
    this.#replansLeft = maxReplans;
  }

  async getResponse(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string | null> {
    if (!this.#authorized) {
      const planOutput = messages.findLast((m) => m.role === "assistant")
        ?.content;
      if (planOutput === undefined) {
        throw new Error(
          "GateEmulatorOperator: no assistant message to react to — the plan turn produced no output",
        );
      }
      const raw = await this.#emulator(this.#problemStatement, planOutput);
      if (raw.trim() === "") {
        throw new Error(
          "GateEmulatorOperator: the emulator returned a blank verdict",
        );
      }
      const { decision, message } = parseGateVerdict(raw);
      if (decision === "replan" && this.#replansLeft > 0) {
        this.#replansLeft--;
        return replanTurn(message, this.#prefix);
      }
      this.#authorized = true;
      return implementTurnWithVerdict(message, this.#prefix);
    }
    const idx = this.#i;
    this.#i++;
    return idx < this.#followups.length ? this.#followups[idx] : null;
  }
}

// --- FR-BENCH-SWE.SYMMETRY: the same human persona serves the bare arm ---

/** Terminal token: the human replies with exactly this when the engineer is
 * done and no reply is needed — the operator then ends the session. */
export const DONE_TOKEN = "DONE";

/**
 * Build the answer conversation for the bare arm. Same reviewer persona
 * as the gate — knows ONLY the issue text, never gold data — but the
 * duty here is answering the engineer's question (or ending the session),
 * not authorizing a plan variant.
 */
export function answerMessages(
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
 * Bare-arm operator: after every agent turn, the human either answers the
 * engineer's question (session continues with that plain-text reply) or
 * replies DONE (session ends). An emulator failure or a blank reply fails the
 * instance loudly — no silent fallback, mirroring the gate operator.
 * Satisfies the `AcpAgent.run(userEmulator)` contract.
 */
export class AnswerEmulatorOperator {
  #problemStatement: string;
  #emulator: HumanEmulator;

  constructor(problemStatement: string, emulator: HumanEmulator) {
    this.#problemStatement = problemStatement;
    this.#emulator = emulator;
  }

  async getResponse(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string | null> {
    const last = messages.findLast((m) => m.role === "assistant")?.content;
    if (last === undefined) {
      throw new Error(
        "AnswerEmulatorOperator: no assistant message to reply to — the agent turn produced no output",
      );
    }
    const reply = (await this.#emulator(this.#problemStatement, last)).trim();
    if (reply === "") {
      throw new Error(
        "AnswerEmulatorOperator: the emulator returned a blank reply",
      );
    }
    return reply === DONE_TOKEN ? null : reply;
  }
}

/**
 * Production emulator over `claude -p` (existing CLI auth, no API key).
 *
 * Isolation is two-fold, both mandatory (verified empirically 2026-07-04):
 * - `env` carries the bench's isolated `HOME` (the adapter's `prepareWorkspace`
 *   bench-home) so the developer's `~/.claude/CLAUDE.md` user memory does not
 *   load;
 * - the emulator runs from a temp cwd OUTSIDE the developer's home, because
 *   ancestor-directory memory files (`CLAUDE.md`/`AGENTS.md` up the cwd path,
 *   e.g. `~/AGENTS.md`) load regardless of `HOME` and their preferences leak
 *   into the verdict (observed: a personal "reply in Russian" rule reached the
 *   bench agent mid-pipeline).
 */
export function makeCliGateEmulator(
  model: string,
  env: Record<string, string> = {},
): HumanEmulator {
  let cwd: string | undefined;
  return async (problemStatement, planOutput) => {
    cwd ??= await Deno.makeTempDir({ prefix: "gate-emulator-" });
    const res = await cliChatCompletion(
      gateMessages(problemStatement, planOutput),
      { model, temperature: 0, env, cwd },
    );
    return res.content;
  };
}

/** CLI answer emulator for the bare arm — same isolation rules as the gate
 * (isolated HOME via env + temp cwd outside the developer's home). */
export function makeCliAnswerEmulator(
  model: string,
  env: Record<string, string> = {},
): HumanEmulator {
  let cwd: string | undefined;
  return async (problemStatement, agentMessage) => {
    cwd ??= await Deno.makeTempDir({ prefix: "answer-emulator-" });
    const res = await cliChatCompletion(
      answerMessages(problemStatement, agentMessage),
      { model, temperature: 0, env, cwd },
    );
    return res.content;
  };
}
