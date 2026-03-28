# Practical Conclusions from "HyperAgents"

**Source**: [HyperAgents](https://arxiv.org/abs/2603.19461) — Jenny Zhang et al., Meta/UBC/Edinburgh, March 2026
**PDF**: https://arxiv.org/pdf/2603.19461
**Code**: https://github.com/facebookresearch/Hyperagents

---

## 1. Persistent memory is the most valuable meta-improvement

Agents **autonomously invent** persistent memory as their first self-improvement priority. The format they create: best results analysis, causal hypotheses, regression diagnostics, next iteration plan with specific thresholds.

**Evidence** (Section 5.2, p.11-12, [PDF p.11](https://arxiv.org/pdf/2603.19461#page=11)):

> "Another example is DGM-H's innovation of persistent memory, which enables learning to accumulate across iterations. Instead of merely logging numerical scores, the hyperagent stores synthesized insights, causal hypotheses, and forward-looking plans (e.g., identifying which generations performed best, diagnosing over-corrections, and proposing how to combine successful strategies). This memory is actively consulted during subsequent self-modification steps, allowing later generations to build on earlier discoveries and avoid repeating past mistakes."

Example of autonomously created memory entry ([PDF p.12](https://arxiv.org/pdf/2603.19461#page=12)):

> ```json
> {
>   "best_performers_analysis": {
>     "value": "Best Performing Generations:\n\nPaper Review:\n
>       - Gen55: 63% acc, 25% accept rate, 38% accept recall, 88% reject recall (too harsh)\n
>       - Gen64: 61% acc, 53% accept rate, 64% accept recall, 58% reject recall (BEST BALANCE)\n\n
>       Key Insight: Gen55 has best accuracy but is too harsh. Gen64 improved balance
>       but lower accuracy. Need to combine gen55's critical reasoning with gen64's balance."
>   },
>   "gen66_results": {
>     "value": "Gen 66 Results (Latest): Paper Review - 52% accuracy (WORSE than gen64's 61%),
>       94% accept rate (EXTREME accept bias). CRITICAL ISSUE: Paper review went backwards
>       - gen65 changes over-corrected."
>   },
>   "iteration_66_improvement": {
>     "value": "Iteration 66 Improvement: CORRECTED paper review prompt after gen65 over-correction.
>       New approach: (1) Clear REJECT criteria with specific triggers, (2) Decision Protocol
>       with explicit thresholds (~40%/~60%), (3) Borderline guidance defaults to REJECT.
>       Target: 62-64% accuracy with 55-65% reject rate."
>   }
> }
> ```

**Implication for flowai**: Reflection (Phase 4) memory format should be structured: best results + causal analysis + next action plan. Not free-form notes.

---

## 2. Performance tracking is the second most important meta-improvement

Agents autonomously create `PerformanceTracker` with history, moving average trends, and comprehensive statistics.

**Evidence** (Section 5.2, p.11, [PDF p.11](https://arxiv.org/pdf/2603.19461#page=11)):

> "One example is DGM-H's autonomous development of performance tracking infrastructure. Rather than relying on isolated evaluation outcomes, the hyperagent records, aggregates, and compares performance metrics across iterations, identifying which changes yield sustained improvements and which lead to regressions. This performance tracking supports informed decision-making, such as prioritizing promising iterations and avoiding unproductive modification directions."

Autonomously introduced code ([PDF p.11](https://arxiv.org/pdf/2603.19461#page=11)):

> ```python
> class PerformanceTracker:
>     """Tracks performance metrics across agent generations."""
>
>     def record_generation(self, generation_id: int, domain: str,
>                          score: float, metadata: dict = None):
>         """Record performance for a generation."""
>
>     def get_improvement_trend(self, domain: str = None, window: int = 5):
>         """Calculate improvement trend using moving average."""
>         recent_avg = sum(h['score'] for h in filtered[-window:]) / window
>         older_avg = sum(h['score'] for h in filtered[-window*2:-window]) / window
>         return recent_avg - older_avg  # Positive if improving
> ```

**Implication for flowai**: Add trend reporting to benchmark runner — show improvement trend across skill versions, not just pass/fail.

---

## 3. Evolution goes from prompt tweaks to structured decision machinery

Agents evolve from superficial instructions to explicit multi-stage pipelines with checklists, decision rules, and clearly defined criteria.

**Evidence** (Section 5.1, p.8-9, [PDF p.8](https://arxiv.org/pdf/2603.19461#page=8)):

> "Qualitatively, the DGM-H improves task agents by moving beyond surface-level prompt tweaks toward structured, reusable decision machinery. In paper review, it shifts from superficial behavioral instructions (e.g., adopting a "rigorous" persona) to explicit multi-stage evaluation pipelines with checklists, decision rules, and clearly defined criteria, resulting in more consistent and higher-quality judgments."

> "In robotics reward design, the DGM-H incrementally builds and refines an internal knowledge base of environment constraints, valid state variables, and reward-scaling heuristics, eliminating compilation failures and reducing reward misspecification. The DGM-H accumulates and refines domain knowledge (e.g., environment documentation, grading criteria) and integrates it into increasingly sophisticated decision frameworks, enabling complex, consistent task behavior without manual, domain-specific engineering."

**Implication for flowai**: Skills should contain specific checklists and decision rules, not abstract instructions ("write good code"). Evolution arrives at this pattern automatically.

---

## 4. Domain knowledge accumulation in internal knowledge base

Agent builds internal KB: environment constraints, valid state variables, reward-scaling heuristics. This eliminates compilation failures and misspecification.

**Evidence**: Same quote as #3 above (Section 5.1, [PDF p.8-9](https://arxiv.org/pdf/2603.19461#page=8)).

**Implication for flowai**: Skills like `flowai-init` and `flowai-update` would benefit from project-specific knowledge accumulation in reflection memory (conventions, common pitfalls). Currently each session starts from zero.

---

## 5. Meta-improvements transfer across domains

Transfer hyperagents from paper review + robotics achieve imp@50 = 0.630 on math grading (from scratch — 0.0). DGM-custom transfer agents achieve 0.0 — their improvements are domain-specific.

**Evidence** (Section 5.2, p.10-11, [PDF p.10](https://arxiv.org/pdf/2603.19461#page=10)):

> "Hyperagents optimized in prior DGM-H runs demonstrate transferable ability to generate improved task agents in a new domain. [...] After 50 iterations of DGM-H w/o self-improve starting from the transfer hyperagents, the best generated agents (selected based on validation score) achieve a test-set score of 0.630 (CI: 0.540 – 0.630). This corresponds to a imp@50 of 0.630 (CI: 0.540 – 0.630). These results show that transfer hyperagents can generate improved agents in a previously unseen domain."

> "We qualitatively attribute the observed transfer gains to a set of general-purpose meta-level capabilities that the DGM-H autonomously acquires during prior runs. In particular, the transfer hyperagents have features such as performance tracking and persistent memory, which allow them to reason about improvement as an ongoing process rather than as isolated code edits. As a result, even when transferred to an unseen domain, these hyperagents can quickly self-improve and make meaningful progress."

**Implication for flowai**: Core skills (flowai-commit, flowai-review) must be domain-agnostic — experimentally confirmed. Domain-specific knowledge belongs in separate packs. Current pack split is correct.

---

## 6. Both open-ended exploration AND self-improvement are necessary

Ablation studies show either component alone produces ~0 progress.

**Evidence** (Section 5.1, p.9, [PDF p.9](https://arxiv.org/pdf/2603.19461#page=9)):

> "Both metacognitive self-modification and open-ended exploration are necessary for sustained improvement. DGM-H w/o self-improve (Hu et al., 2025) shows little to no improvement, achieving test-set performance of 0.0 (CI: 0.0 – 0.130) on paper review and 0.213 (CI: 0.180 – 0.348) on robotics reward design. The DGM-H significantly outperforms this baseline in both domains (p < 0.05), demonstrating that the observed gains in the DGM-H are not solely due to task-level optimization under a fixed meta agent, but also arise from improvements in the self-modification process itself (i.e., the meta agent)."

> "Similarly, DGM-H w/o open-ended exploration fails to achieve meaningful improvement, with test-set performance remaining at 0.0 (CI: 0.0 – 0.560) on paper review and 0.116 (CI: 0.0 – 0.348) on robotics reward design. The DGM-H significantly outperforms this baseline in both domains (p < 0.05), highlighting the importance of open-ended, population-based search to create stepping stones for future improvements."

**Implication for flowai**: For future automated skill improvement — need both variant archive (git history + benchmarks) AND meta-agent ability to modify the improvement process itself. Just "run LLM on SKILL.md and check benchmark" is insufficient.

---

## 7. Initial agent can be minimal

Initial hyperagent: task agent = single LLM call without parsing, meta agent = "Modify any part of the codebase". Two tools: bash + file editor. Scores 0.0 on most tasks. Yet evolves to beat handcrafted baselines.

**Evidence** (Section 4, p.5, [PDF p.5](https://arxiv.org/pdf/2603.19461#page=5)):

> "The DGM-H is initialized with a single hyperagent built around a frozen FM with external tool-use capabilities. [...] This initial hyperagent is equipped with two tools: a bash tool for executing shell commands, and a specialized tool for inspecting and modifying files. In the initial hyperagent, the task agent receives the task inputs and outputs the response from a single FM call. The meta agent receives the location of the agent's repository, the location of previous evaluation results, and the number of remaining experiment iterations (the experiment budget is a hyperparameter), and is tasked with modifying any part of the given codebase. We deliberately keep the implementation of the initial hyperagent (i.e., both the task agent and the meta agent) simple, allowing for a broad search space and avoiding prematurely constraining the range of possible improvements."

Initial meta agent prompt (Appendix A.1, [PDF p.21](https://arxiv.org/pdf/2603.19461#page=21)):

> ```python
> instruction = f"Modify any part of the codebase at '{repo_path}'."
> ```

**Implication for flowai**: Don't over-engineer initial skills. Minimal working version + good benchmarks > trying to anticipate everything upfront.

---

## 8. Sandboxing is mandatory for self-modification

All experiments run in sandbox with timeouts, no internet, resource limits.

**Evidence** (Section 6, p.13, [PDF p.13](https://arxiv.org/pdf/2603.19461#page=13)):

> "In this work, all experiments are conducted under strict safety constraints. In particular, agent-generated code is executed within carefully sandboxed environments with enforced resource limits (e.g., timeouts, restricted internet access). These measures are designed to prevent unintended side effects, contain failures, and ensure that self-modifications remain confined to the intended experimental scope. Moreover, evaluation is performed using predefined tasks and metrics, and human oversight is maintained throughout all experiments."

**Implication for flowai**: If moving toward automated skill improvement (Phase 7+), sandbox is required. Hooks can serve as first step — validating changes before applying.

---

## Summary: Actionable Items for flowai

**Now**:
- Structure Reflection memory format: best results + causal analysis + next plan
- Add trend reporting to benchmark runner
- In skills: checklists and decision rules instead of abstract instructions

**Future**:
- Automated skill improvement via benchmark feedback loop (Phase 7)
- Variant archive for skills (A/B testing)
- Sandbox for self-modification experiments
