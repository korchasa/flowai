# Product Vision

## 1. Vision Statement

To become a set of commands and rules that enable control over AI agents in
AI-first IDEs across all development and support domains, ensuring stable and
predictable outcomes.

## 2. Target Audience

Developers using Cursor and team leads who define organizational standards.

## 3. Problem Statement

AI agents often deviate from requirements. They lack persistent memory and may
lose context in large projects, ignore existing architectural conventions and
code styles, propose superficial solutions that break logic, or get stuck in
loops fixing one error while creating others. Hallucinations of non-existent
libraries or methods are common. The absence of strict boundaries results in
unstable work quality that requires thorough manual review, significantly
reducing the value of automation.

## 4. Solution & Differentiators

The solution is a structured framework of rules (`.cursor/rules`), commands
(`.cursor/commands`), and validation scripts (`deno tasks`) that creates a rigid
execution environment for the AI agent.

### Key Differentiators (USP)

1. **Determinism through Validation**: The agent is required to run
   `deno task check` and fix errors before submitting a task, which eliminates
   "broken" code.
2. **Documentation as Memory**: Using the `documents/` folder as an external
   context storage (SRS/SDS) solves the problem of agent "forgetfulness."
3. **Strict Workflows**: Instead of free-form chat, scripted commands (e.g.,
   `/plan`, `/execute`, `/commit`) guide the agent through specific steps.
4. **Tools for Maintaining Context Relevance**: Specialized commands (e.g.,
   `/update-docs`, `/check`) and rules force the agent to update documentation
   synchronously with code changes, providing "living" project memory.
5. **Enforced Standards**: Rules strictly define code style, commit formats, and
   testing procedures, preventing the agent from improvising where
   standardization is required.

## 5. Business Goals

1. **Efficiency**: Reduce time spent on code review and fixing agent-generated
   errors by 50%.
2. **Stability**: Achieve 100% success rate for local checks (`deno task check`)
   before any commit.
3. **Scalability**: Enable reuse of the ruleset in any project (Deno, Go, Swift,
   etc.) with minimal adaptation.
4. **Autonomy**: Increase the complexity of tasks the agent can perform
   independently from start to finish without human intervention.

## 6. Strategy & Roadmap

There is no fixed roadmap due to the rapid evolution of the AI development
field. We adapt to new model capabilities and tool improvements as they emerge,
maintaining a core focus on our key goals: control, stability, and
predictability.

## 7. Risks & Assumptions

1. **Model Degradation Risk**: New LLM versions may become less effective at
   following complex system prompt instructions. _Mitigation: Continuous prompt
   testing and adaptation for different models._
2. **IDE Change Risk**: Cursor might change its rule storage format or
   application logic. _Mitigation: Monitoring updates and rapid structure
   adaptation._
3. **Overcomplication Risk**: Excessively rigid rules may make development of
   trivial tasks unnecessarily long. _Mitigation: Introducing different
   strictness levels (strict vs. lite)._
4. **Assumption**: We assume that users (developers) are willing to invest time
   in environment setup and following procedures to improve result quality.
