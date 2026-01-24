# Product Vision: Assistant Framework

## 1. Vision Statement

To provide a robust **Assistant Framework**—a set of commands, rules, and workflows—that enables control over AI agents in AI-first IDEs across all development and support domains, ensuring stable and predictable outcomes for any software project.

## 2. Target Audience

Developers using Cursor and team leads who define organizational standards.

## 3. Problem Statement

AI agents often deviate from requirements. They lack persistent memory and may lose context in large projects, ignore existing architectural conventions and code styles, propose superficial solutions that break logic, or get stuck in loops fixing one error while creating others. Hallucinations of non-existent libraries or methods are common. The absence of strict boundaries results in unstable work quality that requires thorough manual review, significantly reducing the value of automation.

## 4. Solution & Differentiators

The solution is the **Assistant Framework**—a structured system of rules (`.cursor/rules`), commands (`.cursor/commands`), and validation hooks that creates a rigid execution environment for the AI agent within any project.

### Key Differentiators (USP)

1. **Determinism through Validation**: The agent is required to run validation tasks (like `deno task check` or `npm run check`) and fix errors before submitting a task, which eliminates "broken" code.
2. **Documentation as Memory**: Using the `documents/` folder as an external context storage (SRS/SDS) solves the problem of agent "forgetfulness."
3. **Strict Workflows**: Instead of free-form chat, scripted commands (e.g., `/plan`, `/execute`, `/commit`) guide the agent through specific steps.
4. **Tools for Maintaining Context Relevance**: Specialized commands (e.g., `/update-docs`, `/check`) and rules force the agent to update documentation synchronously with code changes, providing "living" project memory.
5. **Enforced Standards**: Rules strictly define code style, commit formats, and testing procedures, preventing the agent from improvising where standardization is required.

### 4.1. The Trust Model & Instruction Types

We cannot fully trust the LLM's choices. To guarantee a correct SDLC, we are forced to extract some instructions into **Commands** (skills with `disable-model-invocation: true`). This prevents the agent from automatically transitioning between critical stages, such as moving from planning to execution or from execution to committing, without human verification. Commands act as **guardrails**, enforcing a human-in-the-loop approach for critical state transitions. This results in three distinct types of instructions:

1. **Commands**: Manually triggered by the user. They enforce process boundaries.
2. **Skills**: Automatically triggered by the agent when it recognizes a need.
3. **Subagents**: Automatically triggered by the agent. The agent sees only the result of the subagent's work, not the internal process.

### 4.2. Persistent Context (AGENTS.md)

All persistent agent instructions that must be included in every chat session are located in `AGENTS.md`. This file is automatically detected and included by the Cursor IDE context system. No manual action is required to load these instructions; they serve as the foundational "system prompt" extension for the agent within this workspace.

### 4.4. Requirements Separation

It is crucial to distinguish between the requirements for the **Assistant Framework** itself and the requirements for **Consumer Projects** that utilize the framework.

#### A. Assistant Framework Requirements (This Repo)
These are the requirements for developing and maintaining the framework itself:
1.  **Self-Hosting**: The framework is developed using the framework.
2.  **Tech Stack**: TypeScript, Deno.
3.  **Validation**: `deno task check` (lint, format, typecheck).
4.  **Testing**: `deno task test` (unit tests for scripts).
5.  **Benchmarking**: `deno task bench` (validating agent behavior against scenarios).
6.  **Distribution**: Must be easily installable into other repositories (e.g., via `deno task init`).

#### B. Consumer Project Requirements (Projects using the Framework)
These are the requirements imposed on any project that adopts the Assistant Framework:
1.  **Structure**: Must have a `.cursor` folder and a `documents` folder.
2.  **Documentation**: Must maintain SRS/SDS in `documents/`.
3.  **Verification**: Must provide a standard command for verification (e.g., `npm run check`, `make test`, `cargo check`) that the agent can invoke.
4.  **Context**: Must provide an `AGENTS.md` (or equivalent) for persistent context.
5.  **Discipline**: Users must follow the command-driven workflow (`/plan`, `/do`, etc.) rather than free-form chat for complex tasks.

## 5. Business Goals

1. **Efficiency**: Reduce time spent on code review and fixing agent-generated errors by 50%.
2. **Stability**: Achieve 100% success rate for local checks before any commit.
3. **Scalability**: Enable reuse of the ruleset in any project (Deno, Go, Swift, etc.) with minimal adaptation.
4. **Autonomy**: Increase the complexity of tasks the agent can perform independently from start to finish without human intervention.

## 6. Strategy & Roadmap

There is no fixed roadmap due to the rapid evolution of the AI development field. We adapt to new model capabilities and tool improvements as they emerge, maintaining a core focus on our key goals: control, stability, and predictability.

## 7. Risks & Assumptions

1. **Model Degradation Risk**: New LLM versions may become less effective at following complex system prompt instructions. _Mitigation: Continuous prompt testing and adaptation for different models._
2. **IDE Change Risk**: Cursor might change its rule storage format or application logic. _Mitigation: Monitoring updates and rapid structure adaptation._
3. **Overcomplication Risk**: Excessively rigid rules may make development of trivial tasks unnecessarily long. _Mitigation: Introducing different strictness levels (strict vs. lite)._
4. **Assumption**: We assume that users (developers) are willing to invest time in environment setup and following procedures to improve result quality.
