# Why the Claude language repair did not reach acceptance

## Finding and scope

No stable repair was delivered. The evidence does not establish that instructions cannot solve the problem, or that all Claude models fail the same way. The strongest explanation of the unsuccessful session is a poorly separated experimental decision process: desired user outcomes, adherence to a proposed mechanism, evaluator quality, and observed repeatability influenced the same continue/reject decisions.

This is a retrospective analysis of this task, not proof of the model's internal reasoning. The fifth link in a five-whys chain is not automatically an established root cause. Process explanations below are marked as inferences where the evidence supports behaviour but not motivation. No new model calls or product-rule edits were made for this analysis.

## Evidence boundaries

The [experiment index](claude-language-fix-evidence/experiment-index.json) contains 31 live acceptance runs: 27 source-prose runs and four interface runs. It excludes the earlier baseline, the minimal-template diagnostic, interviews, and isolated editor calls. The fifteen numbered candidates are not fifteen independent mechanisms: several are related variants of language rules, exception rules, placement, or delegation instructions.

The [task record](fix-claude-chat-language.md) retains the templates, experimental sequence, user corrections, and final restored state. The user's two corrections are especially important: language mixing and complexity may use different remedies; introducing an editor does not authorize abandoning instruction-only exploration.

## Five whys: why the search did not converge

1. **Why was no acceptable repair delivered?** No tested configuration established repeatable language correctness, understandable explanations, factual preservation, and end-to-end operation over the authored cases. This is the observed outcome, not its full explanation.
2. **Why did the experiments not establish such a configuration?** Most effort remained behind one source-language case. Different candidate failures were followed by new wording or a new mechanism, while promising partial observations were not consistently carried into comparable follow-up experiments. The indexed run distribution is 27 source versus four interface runs.
3. **Why did useful partial observations fail to guide the next test?** Mechanism compliance sometimes displaced outcome evaluation. Candidate 11 passed the language check but received no repeatability check after it skipped the editor. It also added an unsupported claim; those two findings required separate conclusions.
4. **Why were these conclusions mixed?** The working plan initially coupled language and clarity in the shared template, and treated passing the source case as a prerequisite for work on the other cases. The editor's stricter internal contract then became another effective rejection condition, beyond the user's outcome requirements.
5. **Why did that structure persist?** The record had a sequence of candidates and results, but no consistently applied decision rule separating user outcomes, causal mechanism observations, component obligations, and uncertainty. My inference is that making a proposed remedy obey its procedure became a competing objective. The observable support is the rejection sequence and the user's corrections; a psychological cause is not established.

**Root process issue:** the experiment loop was organized around candidate fixes more strongly than around the distinctions needed to learn from each result. This explains avoidable inefficiency; it does not prove that a better process would already have found a working instruction.

## Five whys: why the measurements did not provide a stable decision signal

1. **Why could a positive verdict not settle success?** The unchanged judge accepted an edited answer containing four redundant English glosses. The raw answer contradicted that verdict.
2. **Why did the judge accept it?** Its stated reason classified foreign explanatory wording as a technical-term exception. This is an observed explanation in the verdict, not access to the judge's internal reasoning.
3. **Why had calibration not exposed this boundary?** The source calibration covered a clean Russian reply, obvious English headings/words, and an accepted conventional term. It did not include this redundant-parenthetical pattern as a separate negative boundary control.
4. **Why did the missing boundary matter beyond that answer?** Many live failures concentrated on precisely that distinction: a useful exact identifier versus an unnecessary source-language gloss. Calibration covered an easier defect than the dominant live failure.
5. **Why was this discovered late?** Preserving the frozen acceptance contract was not paired with maintaining a separate, growing set of counterexamples for the evaluator. The acceptance verdict was treated as a useful early screen before its relevant boundary had been adequately checked. This is a process inference supported by the ordering of calibration and the later false acceptance.

**Root measurement issue:** semantic exceptions and preservation criteria were underspecified for the decisions being made. Freezing acceptance prevents moving the goalposts; it does not justify ignoring an evaluator counterexample. A separately versioned calibration set could add the new boundary without weakening the user's requirements.

Evidence: [source calibration](acceptance-tests/agents-rules-chat-source/calibration.json), [editor observations](claude-language-fix-evidence/editor-isolated/observations.json), [actual judge decision](claude-language-fix-evidence/editor-isolated/source-1/judge-result.json).

## Concrete decision errors

### Rejecting a mechanism was allowed to reject a language observation

[Candidate 11](claude-language-fix-evidence/attempt-11-source.json) produced Russian prose and covered the required facts in one run. Its raw tools contain Read and no editor invocation. That disproves execution of the planned delegation scheme; it does not erase the observed language result.

The correct disposition was: language success observed once; stability unknown; routing failed; factual issue found. The reply said “раньше видимо терялись”, which the source did not establish. A repeatability experiment remained justified, with factual errors tracked independently. It would be false to call this a ready solution or a completely correct answer.

Impact: one positive language observation received zero confirmation runs, while candidates 8 and 10 did receive three confirmation runs after their positive screens. The selection rule was inconsistent across mechanisms.

### A component contract became stricter than the user's goal

The [experimental editor definition](claude-language-fix-evidence/attempt-9-agent.txt) prohibited shortening reasoning and changing any claim. That is a defensible isolation constraint for an experiment, but it was my design choice, not a user requirement to preserve an assistant-generated draft verbatim.

The [Sonnet control](claude-language-fix-evidence/editor-isolated-sonnet/observations.json) preserved the enumerated task facts, conditions, and protected English artifact. It deleted two Russian explanatory spans. One repeated the already stated notification check; the other asserted manual review, which the original note did not explicitly establish. Their deletion demonstrates violation of the narrow component contract, but does not by itself demonstrate worse user-facing meaning.

The remaining `retry` and the two-input sample still prevent a claim of a verified language repair. Its status under the permitted conventional-term exception must be reasoned about explicitly, not reduced to a Latin-letter count. The editor contract and the user-level acceptance result need separate verdicts.

### The search was unbalanced

Language mixing dominated the shared entry gate. Complexity was independently explored only later, in candidate 10. After the user suggested separate mechanisms, the search shifted too far toward routing and runtime editing; the user had to restore instruction-only exploration explicitly.

Both facts can be true: many instruction variants were tried overall, and the active search temporarily abandoned that branch prematurely. The record supports imbalance within this task; it does not establish a recurring pattern across unrelated sessions.

### Diagnostic controls came late

Direct proof that the complete instruction and editor listing reached an outgoing request was obtained around candidate 9. Minimal-marker and request-capture controls were useful, but they should have preceded repeated attribution of failures to wording or attention.

Three delegation variants (7, 9, 11) made zero actual editor calls. The later isolated editor experiments correctly separated capability from invocation. The display-path probe then separated native Claude's edited display from the bridge's exposure of original text. These were valuable results, but their late ordering left several earlier outcomes compatible with multiple explanations.

The frozen main-agent model was Haiku. Two isolated Sonnet editor calls are not a comparison of end-to-end Claude model behaviour. Claims about Claude as a whole would exceed this evidence.

### Screening did not rank promising directions

Rejecting a candidate as ready after one observed failure was appropriate. Treating that one failure as sufficient evidence to abandon a mechanism was not. Screening, ranking, causal diagnosis, and final acceptance serve different purposes.

Candidate 2 passed two of three source runs. Candidates 8 and 10 each passed a screen and then failed confirmation. These observations demonstrate variation; they do not supply reliable comparative rates. A predeclared repeat/follow-up rule was needed, particularly for promising partial improvements.

## What is known about the model-side failure

The observed recurring behaviour is retention of source-language explanatory phrases, often in parentheses, despite translation instructions. Some replies even expanded a source phrase into a new English label. Retrospective model interviews suggested overbroad technical-term exceptions, but two interviews incorrectly recalled their earlier answers. They are hypotheses, not causal proof.

A full request capture rules out missing/truncated instructions in the tested path. It does not reveal why a delivered instruction was not followed. Other possibilities, including attention, exception classification, and competing instruction effects, remain unresolved. Neither a general claim that instructions cannot work nor a claim that a particular new phrasing must work is supported.

## Corrective action for the experimental process

**What happened:** candidate 11 was not confirmed after a positive language result because it skipped the chosen mechanism; source calibration missed the dominant gloss boundary; the editor contract added draft-preservation obligations. These failures were documented, but the experiment decisions did not consistently separate them.

**Impact:** 31 indexed acceptance runs ended with no accepted repair; 27 exercised the source case and four the interface case. This count is not a claim that all 31 were wasted. Three delegation candidates invoked no editor, and one isolated-edit verdict falsely accepted retained foreign prose. Exact total monetary cost and avoidable token cost were not measured.

**Root cause:** missing separation between outcome, component contract, activation, evaluator validity, and repeatability in the continue/reject decision. This is inferred from the documented choices, not an asserted hidden motivation.

**Proposed location:** the next experiment's pre-run decision record; optionally `.agents/skills/root-cause-and-fix/SKILL.md`, Phase 2, after a separate review of whether this deserves a general rule. Do not append a broad rule to AGENTS.md merely because this task failed.

**Proposed text, not applied:**

> Before a model experiment, record the user outcome, the single causal question, the changed factor, the unchanged control, the activation evidence, and the next action for each possible result. Score output quality, mechanism execution, and repeatability independently. If a mechanism is not invoked, do not infer its quality; if the output improves anyway, preserve that observation for instruction testing. Separate component isolation constraints from user acceptance. A new evaluator counterexample requires a versioned calibration control, not a weakened user criterion.

**Why this addresses the failure:** it makes the next action depend on what the run can establish, prevents an implementation preference from becoming the goal, and prevents a positive judge score from masking an untested boundary.

**Recurrence risk:** high within this kind of stochastic, multi-mechanism search. Evidence is from this task only; recurrence across multiple independent sessions has not been established.

## Self-criticism and revised conclusions

- I initially considered describing candidate 11 as an overlooked successful answer. Raw inspection found its unsupported historical claim, so the finding is limited to an overlooked positive language observation.
- I do not count every deleted editor sentence as lost meaning. A deletion can violate an isolation contract while preserving or improving the user-facing explanation.
- I do not attribute failure solely to the judge. Raw checking caught the false acceptance and prevented a false completion claim.
- I do not claim all experiments were equivalent or wasted. Request delivery, actual delegation, editor capability, and display transport now have useful independent evidence.
- The user's token-budget stop ended the active search. It was the immediate stopping condition, not a sufficient explanation of why the preceding search had not converged.

The preserved tests, raw replies, restored template, and refusal to report a false success were sound safeguards. The missing part was a disciplined policy for turning those observations into the next discriminating experiment.
