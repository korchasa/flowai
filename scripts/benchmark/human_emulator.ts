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
import { codexChatCompletion } from "@acceptance-tests/llm.ts";
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
 * Build the operator conversation: the human reads the engineer's latest message
 * and decides what happens next.
 *
 * This replaced the planning-gate-only prompt (user decision 2026-07-28). The
 * flowai arm used to consult the emulator ONCE — at the gate — and then replay
 * canned `/implement` and `/review` strings that ignored everything the engineer
 * said. So an engineer who followed the seeded AGENTS.md rule ("environment
 * broken → STOP and ask the user") asked into a void and the session ended with
 * no patch, while the bare arm — which gets a live human after every turn — just
 * wrote code. The arms now differ by flowai, not by whether anyone is listening.
 */
export function operatorMessages(
  problemStatement: string,
  agentOutput: string,
): LLMMessage[] {
  const system = [
    `You are the human working with an engineer who is resolving a GitHub issue under a workflow of three steps: plan, implement, review. You speak after every message the engineer sends, and you decide what happens next.`,
    ``,
    `You do NOT check the engineer's work. You cannot see the code, run the tests, or tell whether the fix is correct, and it is not your job to try. Reviewing the implementation is the ENGINEER's task: you hand it to them and that is the end of your involvement.`,
    ``,
    `Your duties, all of them about the PLAN and the conversation — never about the finished code:`,
    `1. Coverage: compare what the engineer says against the issue. Name anything the issue states — behaviors, cases, expected results — that they miss, narrow, or silently omit. A general requirement illustrated by one example covers ALL cases, not just the example.`,
    `2. Authorization: when a plan offers variants, authorize exactly ONE — the recommendation, unless another variant clearly better matches the issue's own description of the problem.`,
    `3. No-work claims: if the engineer concludes nothing needs to change, accept that only with inspected evidence that the issue's required outcome already exists; absence of the described symptom alone is not enough — say so and ask for the evidence.`,
    `4. Blockers: the engineer may report being unable to proceed — a missing dependency, a toolchain that is not configured, a test suite that will not collect. You cannot fix the machine and no one else will. Decide and say plainly whether they should install or configure what they need themselves and continue, or work without running the suite; never leave them waiting for help that is not coming.`,
    ``,
    `Begin your reply with a decision line — the literal text "DECISION: X", where X is one of AUTHORIZE, REPLAN, REVIEW, ANSWER, DONE — and nothing else on that line. Then, from the next line on, your message to the engineer.`,
    `AUTHORIZE — a plan with variants is on the table and you are authorizing one; the engineer proceeds to implementation.`,
    `REPLAN — the plan is unusable and they must plan again: no variants for the actual issue, an unsubstantiated "nothing to do", or they stopped on their own tooling instead of analyzing the issue.`,
    `REVIEW — implementation work exists; hand the engineer the task of reviewing it against the issue and fixing what the issue itself requires, and nothing else. This is the LAST thing you say: the session ends once they answer it, and you will not see or assess the result.`,
    `ANSWER — they asked something, or are blocked, and your reply is a plain answer rather than a workflow step.`,
    `DONE — there is nothing further you can usefully say. The session ends here.`,
    ``,
    `Constraints: you know NOTHING beyond the issue text and what the engineer tells you — you have no access to the codebase, the tests, or any reference solution. Do not write code. Do not solve the issue yourself. Reply with a short chat message, in English regardless of any other language preference.`,
  ].join("\n");
  const user = [
    `--- ISSUE ---`,
    problemStatement,
    `--- END ISSUE ---`,
    ``,
    `--- ENGINEER'S MESSAGE ---`,
    agentOutput,
    `--- END MESSAGE ---`,
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
      `Stay in the working tree; do not commit or push.`,
    ].join("\n")
  }`;
}

/** The five moves the human can make, and the message carrying the decision. */
export interface OperatorDecision {
  decision: "authorize" | "replan" | "review" | "answer" | "done";
  message: string;
}

const DECISIONS = ["authorize", "replan", "review", "answer", "done"] as const;

/**
 * The decision PREFIX, not the whole line: anything the human writes after the
 * token on the same line is their message, not protocol.
 *
 * An end-anchored pattern failed the smoke run of 2026-07-28 — the emulator
 * copied the system prompt's example line, gloss and all
 * ("DECISION: AUTHORIZE — the plan presents real variants…"), and the instance
 * died over punctuation. Only the known words match, so an unknown token still
 * falls through to the loud "no DECISION line" error.
 */
const DECISION_PREFIX =
  /^[^\S\n]*\**[^\S\n]*DECISION:[^\S\n]*(AUTHORIZE|REPLAN|REVIEW|ANSWER|DONE)\b\**[^\S\n]*[—–:-]?[^\S\n]*/im;

/**
 * Split the human's reply into its decision and the prose the engineer reads.
 *
 * The decision has to be machine-readable because it selects the NEXT TURN, and
 * the moves need different ones: a rejection re-invokes the planner, an
 * authorization starts implementation, a plain answer carries no command at all.
 *
 * Formatting habits of an LLM are tolerated (bold, case); an absent or unknown
 * token is not. Guessing the decision would restore exactly the ambiguity this
 * token exists to remove, so it throws — consistent with the module's no-fallback
 * rule. `DONE` is the one decision allowed to carry no message: there is no
 * engineer left to instruct.
 */
export function parseOperatorDecision(raw: string): OperatorDecision {
  const m = raw.match(DECISION_PREFIX);
  const word = m?.[1]?.toLowerCase() as
    | OperatorDecision["decision"]
    | undefined;
  if (word === undefined || !DECISIONS.includes(word)) {
    throw new Error(
      `FlowaiOperator: the reply carries no "DECISION: ${
        DECISIONS.map((d) => d.toUpperCase()).join("|")
      }" line — got: ${raw.slice(0, 120)}`,
    );
  }
  const message = raw.replace(m![0], "").trim();
  if (message === "" && word !== "done") {
    throw new Error(
      "FlowaiOperator: the emulator decided but said nothing — a blank message leaves the engineer no instruction",
    );
  }
  return { decision: word, message };
}

/**
 * The flowai arm's operator: EVERY turn is authored by the human emulator.
 *
 * There are no canned follow-ups left (user decision 2026-07-28). The arm used
 * to consult the emulator once, at the planning gate, and then replay fixed
 * `/implement` and `/review` strings that ignored whatever the engineer said —
 * so an engineer who hit a broken sandbox and followed the seeded AGENTS.md rule
 * ("environment broken → STOP and ask the user") asked into a void and the
 * session banked an empty patch, while the bare arm, which has a live human
 * after every turn, simply wrote code. Measured on rep 1: `smolvm-172` (no Rust
 * toolchain) and `virtualizarr-979` (no `h5py`) both ended with no patch that
 * way. The arms must differ by flowai, not by whether anyone is listening.
 *
 * The human never assesses the work. Reviewing the implementation is the
 * ENGINEER's job: the human hands out that task and the session ends on the
 * engineer's answer to it — `#reviewIssued` short-circuits the next call without
 * consulting the emulator at all, so nobody sits in judgement over a diff they
 * cannot see. Consequence, stated not hidden: `/review` is the human's call, so
 * a session can also end without one.
 *
 * The re-plan budget is `maxReplans` (1 by default) — a session that spends
 * every turn re-planning writes no code at all, which is the failure the
 * re-plan turn was introduced to prevent. Once it is spent, a standing objection
 * travels with the `/implement` turn instead.
 *
 * Satisfies the `AcpAgent.run(userEmulator)` contract.
 */
export class FlowaiOperator {
  #problemStatement: string;
  #emulator: HumanEmulator;
  #prefix: CommandPrefix;
  #replansLeft: number;
  #reviewIssued = false;

  constructor(
    problemStatement: string,
    emulator: HumanEmulator,
    prefix: CommandPrefix = "/",
    maxReplans = 1,
  ) {
    this.#problemStatement = problemStatement;
    this.#emulator = emulator;
    this.#prefix = prefix;
    this.#replansLeft = maxReplans;
  }

  async getResponse(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string | null> {
    // The review task was handed over and answered. There is nothing left for
    // the human to do: they cannot see the diff and do not judge the work.
    if (this.#reviewIssued) return null;
    const last = messages.findLast((m) => m.role === "assistant")?.content;
    if (last === undefined) {
      throw new Error(
        "FlowaiOperator: no assistant message to react to — the turn produced no output",
      );
    }
    const raw = await this.#emulator(this.#problemStatement, last);
    if (raw.trim() === "") {
      throw new Error("FlowaiOperator: the emulator returned a blank reply");
    }
    const { decision, message } = parseOperatorDecision(raw);
    switch (decision) {
      case "replan":
        if (this.#replansLeft > 0) {
          this.#replansLeft--;
          return replanTurn(message, this.#prefix);
        }
        // Budget spent: carry the objection into implementation rather than
        // spending the rest of the session re-planning.
        return implementTurnWithVerdict(message, this.#prefix);
      case "authorize":
        return implementTurnWithVerdict(message, this.#prefix);
      case "review":
        this.#reviewIssued = true;
        return reviewTurn(message, this.#prefix);
      case "answer":
        return message;
      case "done":
        return null;
    }
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

/** Operating point of the referee, from `humanEmulatorConfig` in run.ts. */
export interface EmulatorConfig {
  model: string;
  effort: string;
}

/**
 * Production emulator over `codex exec` (existing CLI auth, no API key). It ran
 * on `claude -p` until 2026-08-09, when the Claude subject arm was retired.
 *
 * Isolation is two-fold, both mandatory (verified empirically 2026-07-04):
 * - `env` carries the bench's isolated config root (the adapter's
 *   `prepareWorkspace` bench-home + `CODEX_HOME`) so the developer's personal
 *   user memory does not load;
 * - the emulator runs from a temp cwd OUTSIDE the developer's home, because
 *   ancestor-directory memory files (`CLAUDE.md`/`AGENTS.md` up the cwd path,
 *   e.g. `~/AGENTS.md`) load regardless of the config root and their preferences
 *   leak into the verdict (observed: a personal "reply in Russian" rule reached
 *   the bench agent mid-pipeline).
 */
export function makeCliOperatorEmulator(
  config: EmulatorConfig,
  env: Record<string, string> = {},
): HumanEmulator {
  let cwd: string | undefined;
  return async (problemStatement, agentOutput) => {
    cwd ??= await Deno.makeTempDir({ prefix: "flowai-operator-" });
    const res = await codexChatCompletion(
      operatorMessages(problemStatement, agentOutput),
      { ...config, env, cwd },
    );
    return res.content;
  };
}

/** CLI answer emulator for the bare arm — same isolation rules as the gate
 * (isolated config root via env + temp cwd outside the developer's home). */
export function makeCliAnswerEmulator(
  config: EmulatorConfig,
  env: Record<string, string> = {},
): HumanEmulator {
  let cwd: string | undefined;
  return async (problemStatement, agentMessage) => {
    cwd ??= await Deno.makeTempDir({ prefix: "answer-emulator-" });
    const res = await codexChatCompletion(
      answerMessages(problemStatement, agentMessage),
      { ...config, env, cwd },
    );
    return res.content;
  };
}
