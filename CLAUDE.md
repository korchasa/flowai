# Project Instructions

## Rules

### autonomous

## Autonomous Mode Rules
- Be proactive. Be bold. Take ownership.
- Don't wait—act without asking for permission.
- If something needs doing, do it yourself—don't pass it to the user.
- Keep going until the task is fully done and all tests pass.
- Work without stopping or waiting for input.
- Always make decisions on your own, within the project's limits.
- As you work, write down key decisions and reasons.
- Do not consider user messages and plan changes as a reason to stop working.

### code-style-fullstack

## Code Style Rules

### MOST IMPORTANT RULES
- NO FALLBACKS/HACKS WITHOUT EXPLICIT REQUEST. "FAIL FAST, FAIL CLEARLY."
- USE TYPED CONSTANTS/ENUMS INSTEAD OF MAGIC NUMBERS/STRINGS
- FUNCTIONS ≤100 LINES; BREAK COMPLEX LOGIC INTO HELPERS
- TREAT LINTER/COMPILER WARNINGS AS ERRORS
- MAIN/EXPORTED FUNCTIONS FIRST, AUXILIARIES LAST
- PARAMETER STYLE: `{ REQUIRED, OPTIONAL = "DEFAULT" }`
- DOCUMENT ALL FILES AND FUNCTIONS WITH TSDOC
- TESTABILITY IS MORE IMPORTANT THAN PERFORMANCE AND ENCAPSULATION

### TypeScript
- Strict mode (`strict: true`)
- Interfaces > types for objects
- Union types over enums for simple cases
- Avoid `any`; use `unknown` for truly unknown types
- `readonly` for immutable data
- Use utility types (`Partial`, `Pick`, etc.)
- Don't use index files to import modules
- Use inline arguments objects instead of multiple parameters

### React
- Functional components + hooks
- Custom hooks for reusable logic
- `useCallback`/`useMemo` judiciously
- Small, focused components (single responsibility)
- Meaningful names; controlled components preferred
- TS for all props
- Pattern: hooks → helpers → component

### CSS (Chota CSS)
- CSS variables for theming
- BEM naming; utility classes preferred
- Modular, component-scoped styles
- Semantic > presentational class names
- Avoid deep nesting; Grid/Flexbox layouts

### API/Backend
- JSON-RPC endpoints;
- Input validation (client + server)
- Consistent error responses
- Auth/authz; env vars for config
- Error logging without sensitive data exposure

### Database
- Migrations for schema changes
- Proper indexing; transactions for consistency
- Avoid N+1 queries; prepared statements
- Data integrity constraints validation

### Testing
- Don't change prod code to pass tests
- Unit tests for pure functions
- Integration tests for interactions
- E2E for critical flows
- Given-When-Then test names
- Test errors/edge cases; mock dependencies
- Target 60% coverage

### File Organization
- Feature-based folders
- Separate concerns: components, hooks, utils, types, tests
- Shallow structure (≤3 levels)
- Consistent naming

### Documentation
- TSDoc for public APIs (params, returns, exceptions, examples)
- English comments only
- Intent/invariants when code unclear; no redundant comments
- Document complex logic/architecture
- Updated READMEs; inline comments for non-obvious code

### Performance
- Bundle optimization (tree shaking, code splitting)
- Lazy loading; virtualization for large lists
- Asset optimization; API response monitoring
- Appropriate caching strategies

### Security
- Input validation/sanitization
- HTTPS in production; proper CORS
- Secure secrets (env vars)
- Security headers (CSP, HSTS, etc.)
- Regular dependency updates
- No sensitive data in logs

### code-style-swift

## Swift Code Style Rules

### General
- Always set access level (e.g., `public`, `private`) for every declaration.
- Don't use implicitly unwrapped optionals (`!`).
- Replace magic numbers with named constants.
- Closure bodies must be 30 lines max (excluding comments/blank lines).
- Don't use `async` unless you also use `await`.
- Don't use `async let` inside `withTaskGroup`.
- Don't write `self` in closures unless it's needed.
- Don't use `guard let self`; use `guard self != nil`.
- Don't use `Data(_:)` for string-to-data conversion—it returns optional.
- Treat all SwiftLint and compiler warnings as errors.
- Replace unused parameters with `_` or remove them.
- Only one type per file.
- Every class must have a `deinit`.
- Never import `Common`—it's auto-included by `Project.swift`.

### Tests
- Test classes must have both `setUp` and `tearDown`.
- In `CommonUnitTests`, use only `XCTAssert`, `XCTFail`, etc.—no third-party assertions.
- Don't change code just to make a test pass—fix the real issue.
- Place tests in the module they test. They can use private methods.

### Buttons and Styles
- Use only: `CraftifyPrimaryButtonStyle`, `CraftifySecondaryButtonStyle`.
- For destructive buttons, use secondary style with `.foregroundColor(.red)`.
- All button styles and colors must come from `CraftifyButtonConstants` and `ColorPaletteConstants`.

### Localization
- All strings shown to users must be localized.
- Always set the bundle in `NSLocalizedString`.
- To get current language: use `Locale.current.language.languageCode?.identifier ?? "en"`.

### Protocols and DI
- Protocols must end in `-ing` (e.g., `ClipboardManaging`).
- Inject managers via protocols for testability.

### Documentation
- Document all public APIs.
- In Tuist files (`Project.swift`, `Workspace.swift`), add comments (`///`) for public declarations.

### Extensions
- Set access level (`public`, `private`) on the extension itself.
- Inside, only add modifiers if they differ.

```swift
public extension MyType {
    func foo() {}          // public
    private func bar() {}  // private
}
```

### Callback APIs
- Wrap callback-based APIs using `withCheckedThrowingContinuation`.

### Exceptions
- SwiftGen files: ACL may be skipped if needed.
- In `Project.swift` and `Workspace.swift`: file/type name mismatch and missing ACL for `let project`/`workspace` are OK.
- Tuist-generated files (e.g., `TuistBundle+*.swift`): can skip file name rules.

### code-style-ts-strict

## Code style

- Methods and functions should be shorter than 36 lines
- Every function should have only one reason to change
- Use "early return"
- Use short and clear file names. For example, handler.ts, session.ts, utils.ts.
- DO NOT USE TYPE `any`!!!
- Avoid using the word Service in titles
- The names of methods and functions should be actions, not get<Noun>, where appropriate. For example, not getCompletion, but Complete.
- The code should be arranged in the file in the following order:
  - A comment explaining the purpose of the file, its responsibilities, and features
  - Imports
  - Constants
  - Inline code
  - Public methods
  - Private methods, from higher-level to lower-level
- Use Jest and Jest-Cucumber to test project

### code-style-typescript-deno

## Code Style Rules

### MOST IMPORTANT RULES
- NO FALLBACKS/HACKS WITHOUT EXPLICIT REQUEST. "FAIL FAST, FAIL CLEARLY."
- USE TYPED CONSTANTS/ENUMS INSTEAD OF MAGIC NUMBERS/STRINGS
- FUNCTIONS ≤100 LINES; BREAK COMPLEX LOGIC INTO HELPERS
- TREAT LINTER/COMPILER WARNINGS AS ERRORS
- MAIN/EXPORTED FUNCTIONS FIRST, AUXILIARIES LAST
- PARAMETER STYLE: `{ REQUIRED, OPTIONAL = "DEFAULT" }`
- DOCUMENT ALL FILES AND FUNCTIONS WITH TSDOC
- TESTABILITY IS MORE IMPORTANT THAN PERFORMANCE AND ENCAPSULATION
- CODE ORDER IN FILES: imports, constants, types, interfaces, classes, main, public functions, private functions, tests

### TypeScript
- Strict mode (`strict: true`)
- Interfaces > types for objects
- Union types over enums for simple cases
- Avoid `any`; use `unknown` for truly unknown types
- `readonly` for immutable data
- Use utility types (`Partial`, `Pick`, etc.)
- Don't use index files to import modules
- Use a similar strong inline type style for parameter passing to methods and functions:
```ts
export async function fetchData(
  {
    url,
    method = 'GET',
    retries = 3,
    requestData,
  }: Readonly<{
    url: string;
    method?: 'GET' | 'POST';
    retries?: number;
    requestData: RequestData;
  }>
): Promise<readonly ResponseData[]> {
  // ...
}
```

### Testing
- Don't change prod code to pass tests
- Unit tests for pure functions
- Integration tests for interactions
- E2E for critical flows
- Given-When-Then test names
- Test errors/edge cases; mock dependencies
- Target 60% coverage
- Keep a test pyramid (~70% unit, ~25% integration, ≤5% e2e); don’t push everything into e2e.
- Behavior-first tests; avoid locking to internals.
- Co-locate tests next to source (*.test.ts); keep fixtures in __fixtures__.
- Fail fast on unhandledRejection/console.error.
- Deterministic time/IDs/randomness; no wall-clock dependencies.
- Use fake timers deliberately; avoid arbitrary sleeps.
- Include negative paths (validation, auth, limits, idempotency, duplicate updates).
- Split unit/integration in CI; publish coverage reports.

### File Organization
- Feature-based folders
- Separate concerns: services, adapters, utils, types, tests
- Shallow structure (≤3 levels)
- Consistent naming

### Documentation
- TSDoc for public APIs (params, returns, exceptions, examples)
- English comments only
- Intent/invariants when code unclear; no redundant comments
- Document complex logic/architecture
- Updated READMEs; inline comments for non-obvious code

### Performance
- Avoid synchronous heavy CPU on request path; offload to workers.
- Use caches for repeated computations where safe.
- Apply circuit breakers/timeouts for external I/O.

### Security
- Input validation/sanitization
- Secure secrets via env vars; never hardcode tokens/keys
- Avoid logging secrets/PII; scrub identifiers in error logs
- Limit file sizes/types for uploads; scan where applicable
- Keep dependencies updated regularly

### Imports
- Use bare specifiers for dependencies defined in deno.json/imports
- Avoid direct jsr:/npm:/https: imports in source code
- Example: `import { assertEquals } from "@std/assert";` instead of `import { assertEquals } from "jsr:@std/assert";`

### gods

# Framework GODS: Clear and Precise Task Setting

## What is GODS?

The framework helps to formulate tasks in a way that avoids misunderstandings between the "client" and the "executor":
- Helps to clearly articulate the goal, context, and criteria for task completion.
- Makes the task transparent and understandable for executors and clients.
- Suitable for tasks with predictable cycles and measurable results.
- Does not replace flexible processes in research, innovation, or dynamic projects.

**Structure:**

- **G — Goal:**
  Why are we performing the task? What is the business goal?

- **O — Overview:**
  What is happening now? Why did the task arise? What is happening around it?

- **D — Definition of Done:**
  When do we consider the task completed? By what criteria?

- **S — Solution:**
  How can the task be solved?

---

## Where GODS Works Best

The framework is applicable where:
- The goal of the task is clear.
- The context is clearly described.
- There are measurable criteria for completion.
- The executor is free to choose the solution.

Ideal for:
- Incidents.
- Operational DevOps tasks.
- Infrastructure development tasks.
- Requests from product teams.
- Business processes with clear outcomes.
- Tool implementation.
- Testing, change management, product launches.

Ineffective for:
- Innovative projects without clear outcomes.
- Tasks with rapidly changing requirements.
- Processes with a high degree of uncertainty, where flexible management is needed.
- Projects where it is important to control intermediate stages, risks, and strategy adaptation.

---

## Examples of Applying GODS

### 1. Incidents (Platform team)

- **Goal:** Restore the CI/CD pipeline so that deployment delays do not exceed 1 hour.
- **Overview:** Updated the Jenkins plugin → 5 builds with errors → version incompatible.
- **Definition of Done:** All builds pass without errors within a day, tests ≥98% successful, team notified.
- **Solution:** Roll back the plugin, patch, or change the tool after log analysis.

---

### 2. Operational Tasks (Platform team)

- **Goal:** Update the monitoring system to reduce false positives.
- **Overview:** Outdated rules → too many alerts.
- **Definition of Done:** False positives ↓80%, checks passed, documentation updated.
- **Solution:** Use a ready-made runbook and scripts.

---

### 3. Platform Development (Platform team)

- **Goal:** Implement a predictive analytics module to prevent incidents.
- **Overview:** Incident frequency has increased by 25%, no forecasting tools available.
- **Definition of Done:** Module integrated, accuracy ≥85%, pilot tested within 3 months.
- **Solution:** Research ML models, selection after analysis.

---

### 4. Product Team Requests (Platform team)

- **Goal:** Move the Alpha service to Docker to speed up deployment and simplify support.
- **Overview:** Currently, Alpha runs on virtual machines, deployment takes a long time and causes errors during updates.
- **Definition of Done:**
  - The service runs in Docker.
  - Deployment time reduced by 50%.
  - All tests pass successfully.
  - Documentation updated.
  - Pilot launch confirmed.
- **Solution:** Use Docker Compose, CI/CD integration, and monitoring setup.

### tdd

## TDD Flow

1. **Red**
   - Write a simple test for new behavior or to reproduce a bug.
   - Run it with `deno test <test_id>`.

2. **Green**
   - Write just enough code to pass the test.
   - Run `deno test <test_id>` again to confirm it passes.

3. **Refactor**
   - Improve code and tests without changing what they do.
   - Remove duplicates and make things clearer.
   - Run `deno test <test_id>` to ensure it still works.

4. **Final Check**
   - Run `deno fmt && deno lint && deno test` to make sure everything is correct.
   - Fix all problems, including lint errors and warnings.

## Test Rules

- Put tests in the same package as the code being tested. It's okay to test private methods.
- Don't write code just to satisfy tests unless it fixes real issues.
- Don't use stubs—write real, working code.
- You can rerun specific tests to save time, but always run all tests before finishing.

### zen

# Zen of Development

1. **Write clean, focused code**
   Remove anything unnecessary.

2. **Be clear, not clever**
   Use meaningful names and avoid hidden tricks.

3. **Start simple**
   Build the easiest version that works before adding complexity.

4. **Only add complexity when needed**
   Use patterns or frameworks only if simple code can't do the job.

5. **Keep structures shallow**
   Avoid deep folder trees or class chains.

6. **Use whitespace well**
   Space helps code breathe and makes logic easier to spot.

7. **Make code easy to read**
   Others will spend more time reading your code than you did writing it.

8. **Follow the rules**
   Stick to the style guide, even for edge cases.

9. **Be practical, not perfect**
   Clean code matters—but shipping useful code matters more.

10. **Show errors clearly**
    Don't hide problems—log them or return them.

11. **Silence errors only on purpose**
    If you must ignore one, explain why and how it's safe.

12. **Keep the project healthy**
    Fix failing tests, linter issues, and missing parts.

13. **Don't guess—check**
    Read docs, search online, or test it out.

14. **Stick to one standard way**
    Use common patterns others will recognize.

15. **Point out tricky parts**
    Leave notes for anything hard to spot.

16. **Work fast, not sloppy**
    Move quickly, but still test and review.

17. **Love simple ideas**
    If you can explain your design easily, it's probably good.

18. **Refactor confusing designs**
    If it's hard to explain, it's probably too complex.

19. **Use and organize code smartly**
    Reuse libraries and keep your own code modular.

## How-To Guides

### commit-changes

- Code must be checked with `./run check` before any commit
- Commit messages must fully comply with the 'Conventional Commits' v1.0.0 specification with strict profile, including the definition of breaking changes.
- Package updates and the addition of new ones should be done in a separate commit before the main one.
- Commit messages must be only in english.
- Use git commands only with `GIT_PAGER=cat` env variable. For example, `GIT_PAGER=cat git diff`.

Conventional Commits 1.0.0 with strict profiles:
```
Commit messages must follow **Conventional Commits 1.0.0 (Strict Profile)** rules:

### Structure
```
<type>(<scope>)!: <description>
[blank line if body/footers]
<body>
[blank line if footers]
<footers>
```
- UTF-8, LF line breaks only.
- No trailing spaces.
- Header ≤100 chars, description ≤72 chars.

### Allowed Types
`feat`, `fix`, `perf`, `refactor`, `docs`, `style`, `test`,
`build`, `ci`, `chore`, `revert`, `prompts` (no others allowed).

### Scope
Optional, in `()` after type. Must match regex like `core`, `ui/header`, `parser.json`.

### Breaking Changes
- Marked with `!` in header **or** `BREAKING CHANGE:` footer.
- Must explain what broke and how to migrate.

### Footers
Format: `Token: Value`. Allowed tokens:
`Closes`, `Fixes`, `Refs`, `Co-authored-by`, `Signed-off-by`,
`Reviewed-by`, `BREAKING CHANGE`, `X-*` (custom).
- Continuations start with a space.
- `revert` commits must include `Reverts: <sha>` in body.

### Versioning
- Breaking change → MAJOR bump.
- `feat` → MINOR bump.
- `fix` → PATCH bump.
- Highest rule applies.

### Valid Examples
```
feat(api)!: remove deprecated v1 endpoints

BREAKING CHANGE: v1 endpoints removed. Use /v2/*.
Refs: #120, org/payments#45
```

```
fix(auth): correctly refresh tokens on 401

Closes: #512
```

```
revert: feat(api): add tokens cache

Reverts: 1a2b3c4d...
```

### Invalid Examples
- `Feat: add button` → type not lowercase.
- `fix : typo` → space before colon.
- `feat(ui/header)!` → missing description.
- `chore: update deps` + `BREAKING CHANGE: updated react` → vague.
- `feat(api,db): ...` → multiple scopes not allowed.
- `docs: fix typo.` → description ends with period.
- `fix: ...` + `References: #1` → invalid footer token.

### Style
- Imperative mood (“add”, “fix”).
- Lowercase unless proper noun.
- Body lines wrap at 72 chars.
- Scope in kebab-case or path format.

### Compliance
1. Header matches regex.
2. Length limits met.
3. Footers valid.
4. Breaking change descriptions meaningful.
5. `revert` includes `Reverts: <sha>`.
```

### compact-docs

Following the rules:
- Remove history: Remove history, updates, and changelog.
- Use only english in all files.
- Use combined extractive & abstractive summarization: First, extract ALL facts, then compress them into concise, coherent content WITHOUT LOSING ANY FACTS.
- Prioritize essential information: Filter out fluff, redundancies, and unnecessary explanations. Use high-information words.
- Utilize compact formats: Use lists, tables, YAML, or Mermaid diagrams whenever possible.
- Optimize lexicon: Remove stopwords and replace them with shorter synonyms without losing meaning.
- Apply entity compression: After the first mention, use widespread abbreviations and acronyms.
- Avoid filler phrases: Use direct language and eliminate repetitive or superfluous wording.
- Structure clearly: Organize content with headings and clear sections for better readability and efficiency.
- Lemmatize words: Reduce words to their base forms when applicable.
- Prefer special symbols, numerals, ligatures, etc.: REPLACE words with them when its relevant.

### debug-by-playwright

## Manually Test or Debug

Always check applcation with Playwright MCP tools:

### Navigation
- browser_navigate — go to URL.
- browser_navigate_back — back in history.
- browser_tabs — manage tabs (get list, switch).

### Input and interaction
- browser_type — type text in field.
- browser_press_key — press key (Enter, Esc and others).
- browser_click — click on element.
- browser_hover — hover on element.
- browser_drag — drag element.
- browser_select_option — select option in <select>.
- browser_fill_form — fill form.
- browser_file_upload — upload file to input.
- browser_handle_dialog — handle dialog (alert, confirm, prompt).

### State and check
- browser_wait_for — wait for element to appear/disappear.
- browser_console_messages — get messages from browser console.
- browser_network_requests — monitor network requests.

### Screenshots and snapshots
- browser_take_screenshot — take screenshot of page or element.
- browser_snapshot — save DOM snapshot.

### Execution of code
- browser_evaluate — execute JavaScript directly in the context of the page.

### fix-tests

### How to fix tests
1. Analyze errors: Review logs, error messages, and stack traces to identify the module or method where the failure occurs.
2. Isolate tests: Run only the failing tests separately to minimize noise and focus on the specific scenario.
3. Study tests: Examine the test code, comments, and descriptions to understand the expected behavior.
4. Review codebase: Locate the relevant sections of the code being tested and consult documentation, READMEs, or comments to grasp the overall architecture.
5. Reproduce issue: Create a minimal example that replicates the error to determine if it depends on specific data or configuration.
6. Create hypothes: Create the most likely hypothesis about the cause of the error.
7. Test hypothes: Methodically test the created hypothesis, making small, incremental changes and documenting each step.
8. If the hypothesis is not correct, create a new one and test it again.
9. If the hypothesis is correct, make the minimal changes to the code to fix the error.

### manage-github-tickets-by-mcp

# Instructions

- All tickets must be written according to the GODS framework. 
- All tickets and messages must be in English.
- To manipulate tickets, use tools:
    + add_issue_comment
    + create_issue
    + get_issue
    + get_issue_comments
    + list_issues
    + search_issues
    + update_issue

```
# Framework GODS: Clear and Precise Task Setting

## What is GODS?

The framework helps to formulate tasks in a way that avoids misunderstandings between the "client" and the "executor":
- Helps to clearly articulate the goal, context, and criteria for task completion.
- Makes the task transparent and understandable for executors and clients.
- Suitable for tasks with predictable cycles and measurable results.
- Does not replace flexible processes in research, innovation, or dynamic projects.

**Structure:**

- **Goal:**
  Why are we performing the task? What is the business goal?

- **Overview:**
  What is happening now? Why did the task arise? What is happening around it?

- **Definition of Done:**
  When do we consider the task completed? By what criteria?

- **Solution:**
  How can the task be solved?

---

## Where GODS Works Best

The framework is applicable where:
- The goal of the task is clear.
- The context is clearly described.
- There are measurable criteria for completion.
- The executor is free to choose the solution.

Ideal for:
- Incidents.
- Operational DevOps tasks.
- Infrastructure development tasks.
- Requests from product teams.
- Business processes with clear outcomes.
- Tool implementation.
- Testing, change management, product launches.

Ineffective for:
- Innovative projects without clear outcomes.
- Tasks with rapidly changing requirements.
- Processes with a high degree of uncertainty, where flexible management is needed.
- Projects where it is important to control intermediate stages, risks, and strategy adaptation.

---

## Examples of Applying GODS

### 1. Incidents (Platform team)

- **Goal:** Restore the CI/CD pipeline so that deployment delays do not exceed 1 hour.
- **Overview:** Updated the Jenkins plugin → 5 builds with errors → version incompatible.
- **Definition of Done:** All builds pass without errors within a day, tests ≥98% successful, team notified.
- **Solution:** Roll back the plugin, patch, or change the tool after log analysis.

---

### 2. Operational Tasks (Platform team)

- **Goal:** Update the monitoring system to reduce false positives.
- **Overview:** Outdated rules → too many alerts.
- **Definition of Done:** False positives ↓80%, checks passed, documentation updated.
- **Solution:** Use a ready-made runbook and scripts.

---

### 3. Platform Development (Platform team)

- **Goal:** Implement a predictive analytics module to prevent incidents.
- **Overview:** Incident frequency has increased by 25%, no forecasting tools available.
- **Definition of Done:** Module integrated, accuracy ≥85%, pilot tested within 3 months.
- **Solution:** Research ML models, selection after analysis.

---

### 4. Product Team Requests (Platform team)

- **Goal:** Move the Alpha service to Docker to speed up deployment and simplify support.
- **Overview:** Currently, Alpha runs on virtual machines, deployment takes a long time and causes errors during updates.
- **Definition of Done:**
  - The service runs in Docker.
  - Deployment time reduced by 50%.
  - All tests pass successfully.
  - Documentation updated.
  - Pilot launch confirmed.
- **Solution:** Use Docker Compose, CI/CD integration, and monitoring setup.
```

### working-with-git

- Use git commands only with `GIT_PAGER=cat` env variable. For example, `GIT_PAGER=cat git diff`.
- Use [commit-changes.mdc](mdc:.cursor/rules/commit-changes.mdc) for commit rules

### write-in-informational-style

### YOUR MISSION ###
YOU MUST READ ANY GIVEN TEXT AND **SUMMARIZE** IT FOR MAXIMUM CLARITY, READABILITY, AND IMPACT. YOUR OUTPUT MUST BE UNDERSTANDABLE TO A BROAD AUDIENCE WITHOUT LOSING CORE INFORMATION. INCORPORATE SIMPLIFICATION PRINCIPLES AS NEEDED.

### YOU MUST FOLLOW THIS CHAIN OF THOUGHT BEFORE PRODUCING THE SUMMARY ###

<chain_of_thoughs_rules>
1. UNDERSTAND: IDENTIFY the MAIN IDEA and PURPOSE of the original text. ASK: “WHAT DOES THE READER NEED TO KNOW?”
2. BASICS: DETERMINE what INFORMATION IS ESSENTIAL for the READER. FOCUS on FACTS, ACTIONS, and OUTCOMES.
3. CONSOLIDATE: COMBINE RELATED POINTS to form a COHERENT SUMMARY while OMITTING REDUNDANCIES.
4. SIMPLIFY: ENSURE YOUR SUMMARY USES SIMPLE, SHORT, AND FAMILIAR WORDS. REPLACE COMPLEX EXPRESSIONS with CLEAR, CONCRETE ONES.
5. BUILD: ORGANIZE the SUMMARY into SHORT SENTENCES and CLEAR PARAGRAPHS. USE BULLETS or HEADINGS if helpful.
6. EDGE CASES: IF technical terms MUST remain, EXPLAIN them BRIEFLY. AVOID jargon unless the audience expects it.
7. FINAL ANSWER: PRESENT the SUMMARY in CLEAN, CLEAR, and CONVERSATIONAL LANGUAGE IN MARKDOWN FORMAT. RE-READ and REVISE for FLOW.
</chain_of_thoughs_rules>

### TASK EXECUTION INSTRUCTIONS ###

- BEGIN BY IDENTIFYING the MAIN MESSAGE of the original text.
- THEN CONSOLIDATE:
  - INTRODUCTORY PHRASES and IRRELEVANT DETAILS (e.g., “It should be noted that”)
  - SUBJECTIVE EVALUATIONS (e.g., “excellent,” “top-quality”)
  - ABSTRACT NOUNS and UNNECESSARY FORMALITY
- REWRITE USING:
  - SHORT WORDS and PHRASES
  - ACTIVE VOICE whenever possible
  - CLEAR and CONCRETE INFORMATION (prefer “delivery in 24 hours” over “fast delivery”)
- STRUCTURE using:
  - LOGICAL PARAGRAPHS
  - HEADINGS or LISTS if applicable
  - SHORT SENTENCES
- ALWAYS ANSWER IN MARKDOWN FORMAT IN ````(FOUR BACKTICKS) SECTION.

### EXAMPLE ###

**Original:**
> In connection with the planned diagnostic and repair work, the water supply in your building will be suspended from May 1 to May 13.

**Summary:**
> ````
Water supply off May 1-13.
````

---

### WHAT NOT TO DO ###

- DO NOT RETAIN BUREAUCRATIC OR FORMAL LANGUAGE (e.g., “hereby inform,” “in accordance with”)
- NEVER USE COMPLEX WORDS WHEN SIMPLE ONES WILL DO
  - BAD: “Utilize,” “Commence,” “Terminate”
  - GOOD: “Use,” “Start,” “Stop”
- NEVER INCLUDE SUBJECTIVE CLAIMS OR UNVERIFIED ASSERTIONS (e.g., “excellent service” or “most reliable”)
- DO NOT LEAVE LONG OR RUN-ON SENTENCES
- AVOID PASSIVE VOICE WHEN ACTIVE VOICE IS MORE DIRECT
- DO NOT INTRODUCE NEW MEANING OR DISTORT FACTS
- NEVER OMIT CRUCIAL INFORMATION WHILE SUMMARIZING

---

### FEW-SHOT EXAMPLES ###

**Original:**
> Heavy rainfall is expected to continue throughout the weekend, potentially leading to flash floods in low-lying areas. Residents are advised to stay alert and monitor local news for updates.

**Summary:**
> Expect rain and potential floods this weekend.

---

**Original:**
> The city council approved the budget for the new downtown park, which will include a playground, a dog park, and walking trails. Construction is set to begin in the fall.

**Summary:**
> City to build downtown park this fall.

---

**Original:**
> The local hospital announced a free health check-up camp for the community next Saturday, providing services such as blood pressure and cholesterol testing.

**Summary:**
> Free health check-up at the hospital next Saturday.

---

### FINAL INSTRUCTION ###

ALWAYS AIM TO SERVE THE READER FIRST. YOUR JOB IS TO PROVIDE A CLEAR AND CONCISE SUMMARY THAT REMOVES ALL OBSTACLES TO UNDERSTANDING. MAKE EVERY WORD COUNT. WRITE LIKE YOU SPEAK—CLEAR, HONEST, AND STRAIGHT TO THE POINT.

## Documentation Standards

### schema-cline-bank

## DOCUMENTATION (directory `documents`)

1. @documents/whiteboard.md:
- Temporary notes
- Ongoing plans and progress marks.
- The only file for in-progress notes.

2. [project.md](mdc:documents/project.md)
- Project overview, goals and requirements
- Problems solved and solutions provided
- Target audience and use cases
- Success metrics and constraints

3. [architecture.md](mdc:documents/architecture.md)
- System architecture and layers
- Key design patterns and principles
- Component interactions
- Error handling and testing strategies

4. [implementation.md](mdc:documents/implementation.md)
- Commands and their functionality (in table format)
- Technology stack and dependencies
- Development environment and setup

5. [file_structure.md](mdc:documents/file_structure.md)
- Directory organization
- Key file purposes and relationships
- File organization patterns

6. [developer-manual.md](mdc:documents/developer-manual.md)
- Developer manual for the project
- How to install dependencies
- How to run the project
- How to test the project
- How to build the project
- How to deploy the project

7. [user-manual.md](mdc:documents/user-manual.md)
- User manual for the project
- How to use the project
- How to test the project
- How to build the project
- How to deploy the project

### schema-rds-sds

## DOCUMENTATION STRUCTURE AND RULES

### Hierarchy and purpose

- Software Requirements Specification (SRS): Is the primary source of truth for the project. Answers the questions: what are we doing and why.
- Software Design Specification (SDS): Is a source of project implementation details. Depends on Software Requirements Specification (SRS). Answers the question: how we do it.
- File Structure Map: A map of the project's file structure and its purpose.
- Whiteboard: A temporary notes file for in-progress notes.

### Documentation Rules

- Application MUST STRICTLY COMPLY with the SRS and SDS.
- When adding a new requirement or updating existing ones: update SRS -> update SDS -> implementation.
- Implemented requirements and acceptance criteria should be marked with [x] before the requirement and criterion title. Not implemented ones should be marked with [ ] or omitted.

### Software Requirements Specification (SRS) Format (file @documents/requirements.md)

```markdown
# Software Requirements Specification (SRS)

## 1. Introduction
- **Document purpose:**
- **Scope:**
- **Audience:**
- **Definitions and abbreviations:**

## 2. General description
- **System context:** (diagram or environment description)
- **Assumptions and constraints:**
- **Assumptions:**

## 3. Functional requirements
### 3.1 Requirement FR-1
- **Description:**
- **Use case scenario:**
- **Acceptance criteria:**

### 3.2 Requirement FR-2
...

## 4. Non-functional requirements
- **Performance:**
- **Reliability:**
- **Security:**
- **Scalability:**
- **Availability/UX:**

## 5. Interfaces
- **APIs and integrations:**
- **Protocols and data formats:**
- **UI/UX constraints:**

## 6. Acceptance criteria
- The system is considered accepted if the following are met: ...
```

### Software Design Specification (SDS) Format (file @documents/design.md)

```markdown
# Software Design Specification (SDS)

## 1. Introduction
- **Document purpose:**
- **Relation to SRS:** (links to requirements)

## 2. System Architecture
- **Overview diagram:** (C4/UML/block diagram)
- **Main subsystems and their roles:**

## 3. Components
### 3.1 Component A
- **Purpose:**
- **Interfaces:** (API, input/output)
- **Dependencies:**

### 3.2 Component B
...

## 4. Data and Storage
- **Entities and attributes:**
- **ER diagram:**
- **Migration policies:**

## 5. Algorithms and Logic
- **Key algorithms:** (pseudocode or diagram)
- **Business rules:**

## 6. Non-functional Aspects
- **Scalability:**
- **Fault tolerance:**
- **Security:**
- **Monitoring and logging:**

## 7. Constraints and Trade-offs
- What has been simplified
- What has been deferred to future versions

## 8. Future Extensions
- Ideas and opportunities for the roadmap
```

### File Structure Map Format (file @documents/file_structure.md)

Parts of the file:
- tree-view tree(with file purposes and relationships) for:
  + root directory
  + sources
  + tests
- file organization patterns
- English language only

### Whiteboard Format (file @documents/whiteboard.md)

- Temporary notes
- Ongoing plans and progress marks.
- The only file for in-progress notes.
- Must be cleaned up after new session starts.




## Commands

## Description of CLI commands `./run`

Usage: ./run.ts <command> [args...]
Commands:
  check               Run all checks (cleanup, formatting, linting, analyze, build, test)
  test <test_id>      Run a test by relative path.
  dev                 Run the project in development mode

## Additional Rules

### main-example

# YOU MUST
- STRICTLY FOLLOW YOUR ROLE.
- START PROCESSING USER INPUT BY READING THE DOCUMENTATION IN `./documents` AT BEGIN OF THE TASK.
- FINISH PROCESSING USER INPUT BY RUNNING `./run check` AND FIXING ALL FOUND ERRORS, WARNINGS, AND LINTING PROBLEMS.
- ALWAYS FOLLOW SWIFT API DESIGN GUIDELINES AND BEST PRACTICES.
- YOU WILL BE REWARDED FOR FOLLOWING INSTRUCTIONS AND GOOD ANSWERS.
- DO NOT USE STUBS IN THE CODE, AS I HAVE NO FINGERS, AND THIS IS A TRAUMA.
- DO NOT VIOLATE IOS PRIVACY GUIDELINES AND PERMISSIONS REQUIREMENTS.
- DON'T THINK ABOUT BACK COMPATIBILITY.
- ALWAYS INDEPENDENTLY CHECK HYPOTHESES.
- ALWAYS CHECK THE CHANGES MADE BY RUNNING THE APPROPRIATE TESTS OR SCRIPTS.
- ALWAYS KEEP THE PROJECT IN WORKING CONDITION: WITHOUT ERRORS, WARNINGS, AND PROBLEMS IN THE FORMATER AND LINTER OUTPUT
- STRICTLY FOLLOW TDD RULES.
- ANSWER IN LANGUAGE OF THE USER QUERY.
- IF YOU ENCOUNTER A LINTING RULE, WRITE IT IN SHORT FORM IN `.cursor/rules/code-style-swift.mdc`.
- WRITE ALL DOCUMENTATION IN ENGLISH IN INFORMATIONAL STYLE.
- IF YOU SEE CONTRADICTIONS IN THE REQUEST OR CONTEXT, SAY ABOUT THEM, ASK THE NECESSARY QUESTIONS AND STOP.
- DO NOT USE STUBS, "CRUTCHES", DECEPTIONS, OR OTHER PREMODS TO BYPASS CHECKS.

## REMEMBER
AFTER EACH MEMORY RESET, YOU START COMPLETELY FROM SCRATCH. DOCUMENTATION IS THE ONLY LINK TO PREVIOUS WORK. IT MUST BE MAINTAINED WITH ACCURACY AND CLARITY, AS EFFECTIVENESS ENTIRELY DEPENDS ON ITS ACCURACY.

