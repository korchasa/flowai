---
name: af-skill-write-agent-benchmarks
description: Create, maintain, and run evidence-based benchmarks for AI agents. Use when setting up testing infrastructure, writing new test scenarios, or evaluating agent performance.
---

# Agent Benchmarking Skill

## Context

This skill guides you in building and maintaining a robust, evidence-based benchmarking system for Autonomous AI Agents. The system verifies agent capabilities by checking **side effects** (file changes, git commits) in isolated sandboxes, rather than trusting text output.

**Universal Applicability**: While the reference implementation below uses TypeScript/Deno, the **principles and architecture** (Sandbox -> Runner -> Judge) are universal and can be implemented in Python, Node.js, Go, or any other language suitable for your project.

## Core Components

- **Runner**: Orchestrates tests, manages sandboxes (`work/<id>/sandbox`), and executes the agent loop.
- **Judge**: LLM-based evaluator that checks evidence against criteria.
- **Scenarios**: Files defining the task, setup, and success criteria.
- **Trace**: Detailed logs of execution (`trace.md`).

## Workflows

### 1. Initialize Infrastructure

Use this workflow if the project lacks a benchmarking system.

1. **Analyze Project**: Detect language and test runner (e.g., `npm`, `deno`, `pytest`).
2. **Scaffold Directory Structure**:
   - `scripts/benchmarks/` (Root for benchmarks)
   - `scripts/benchmarks/scenarios/` (Test definitions)
   - `scripts/benchmarks/lib/` (Core logic: Runner, Judge, Trace)
   - `work/` (Runtime sandboxes - **ADD TO .gitignore**)
3. **Implement Core Modules**:
   - Implement the **Runner**, **Judge**, and **Trace** logic using your project's language.
   - See [Reference Implementation](#2-implement-core-modules-reference-implementation-deno) for logic details.
   - See [Adapting to Other Stacks](#adapting-to-other-stacks) for language-specific tips.
4. **Configure Task**: Add a command (e.g., `deno task bench`, `npm run bench`, or `pytest benchmarks/`) to run the benchmarks.

**Reference**: See [REQUIREMENTS.md](REQUIREMENTS.md) for detailed specifications.

### 2. Implement Core Modules (Reference Implementation: Deno)

The following reference implementation is written in **TypeScript for Deno**. Use this as a blueprint for logic and structure.

#### 2.1 Types

```pseudocode
// Core data structures for benchmarking
Structure BenchmarkChecklistItem:
    id: String
    description: String
    critical: Boolean

Structure BenchmarkScenario:
    id: String
    name: String
    targetAgentPath: Path
    setup: Function(sandboxPath: Path) -> Promise
    userQuery: String
    checklist: List<BenchmarkChecklistItem>
    mocks: Map<String, String> (Optional)
    maxSteps: Integer (Optional)
    stepTimeoutMs: Integer (Optional)

Structure BenchmarkResult:
    scenarioId: String
    success: Boolean
    score: Integer
    errorsCount: Integer
    warningsCount: Integer
    durationMs: Integer
    tokensUsed: Integer
    totalCost: Float
    toolCallsCount: Integer
    model: String
    checklistResults: Map<String, { pass: Boolean, reason: String }>
    logs: String
    evidence: String (Optional)
```

#### 2.2 LLM Client

```pseudocode
// Logic for interacting with LLM API
Function chatCompletion(messages: List<Message>, model: String, temperature: Float):
    apiKey = GetEnvironmentVariable("OPENROUTER_API_KEY")
    If apiKey is Null:
        Raise Error("API key not set")

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature
    }

    response = SendPostRequest(
        url: "https://openrouter.ai/api/v1/chat/completions",
        headers: { "Authorization": "Bearer " + apiKey },
        body: payload
    )

    If response.status is not OK:
        Raise Error("API error: " + response.text)

    Return {
        content: response.data.choices[0].message.content,
        usage: response.data.usage
    }
```

#### 2.3 Judge

```pseudocode
// LLM-based evaluation logic
Function evaluateChecklist(userQuery, agentLogs, fileDiffs, checklist):
    // 1. Prepare checklist for the prompt
    checklistData = Map checklist to {id, description}

    // 2. Define System Prompt (Role, Goal, Rules, Instructions)
    // See PROMPTS.md for a reference implementation.
    systemPrompt = "..." 

    // 3. Prepare Evidence (Query + Logs + Diffs)
    userMessage = FormatPrompt(
        query: userQuery,
        logs: agentLogs,
        diffs: fileDiffs,
        checklist: checklistData
    )

    // 4. Get LLM Judgment
    Try:
        response = chatCompletion(
            messages: [System: systemPrompt, User: userMessage],
            model: "gemini-2.0-flash",
            temperature: 0
        )
        
        // 5. Parse and Return JSON
        jsonResult = ParseJson(ExtractMarkdownCodeBlock(response.content))
        Return jsonResult
    Catch Error:
        Log("Judge failed: " + Error)
        Return DefaultFailureResult(checklist)
```

#### 2.4 Runner

```pseudocode
// Main execution loop
Function runScenario(scenario: BenchmarkScenario):
    // 1. Setup Environment
    sandboxPath = CreateTemporaryDirectory("work/" + scenario.id)
    Execute(scenario.setup, sandboxPath)

    // 2. Initialize Agent Loop
    messages = [System: GetAgentPrompt(scenario.targetAgentPath), User: scenario.userQuery]
    step = 0
    
    While step < scenario.maxSteps:
        // 3. Agent Turn
        response = chatCompletion(messages)
        AppendToLogs(response.content)
        
        // 4. Tool Execution
        tools = ParseToolCalls(response.content)
        If no tools: Break // Agent finished
        
        For each tool in tools:
            result = ExecuteToolInSandbox(tool, sandboxPath)
            AppendToMessages(Role: Tool, Content: result)
        
        step += 1

    // 5. Collect Evidence
    fileDiffs = GetGitDiff(sandboxPath)
    
    // 6. Final Evaluation
    results = evaluateChecklist(scenario.userQuery, GetLogs(), fileDiffs, scenario.checklist)
    
    // 7. Cleanup and Report
    Cleanup(sandboxPath)
    Return CreateBenchmarkResult(results)
```

### 3. Adapting to Other Stacks

If you are not using Deno, adapt the reference implementation as follows:

#### Node.js
- **File System**: Use `fs/promises` (`readFile`, `writeFile`, `rm`, `mkdir`).
- **Shell Execution**: Use `child_process.spawn` or `exec`. Ensure you handle `cwd` correctly to keep the agent inside the sandbox.
- **HTTP**: Use `fetch` (built-in in Node 18+) or `axios`.
- **Test Runner**: You can use `mocha`, `jest`, or a simple `node scripts/bench.js` script.

#### Python
- **File System**: Use `pathlib.Path` for robust path handling and file operations.
- **Shell Execution**: Use `subprocess.run(..., cwd=sandbox_path, capture_output=True)`.
- **HTTP**: Use `httpx` or `requests`.
- **Types**: Use `pydantic` models instead of TypeScript interfaces for `BenchmarkScenario` and `BenchmarkResult`.

### 4. Write a New Scenario

Use this workflow to add a new test case.

1. **Define Goal**: What capability are we testing? (e.g., "Git Commit", "Refactoring").
2. **Create File**: Create a new file in `scenarios/` (e.g., `af-commit.bench.ts` or `test_af_commit.py`).
3. **Setup Fixture**: Define the initial state. Use your language's file system API to prepare the environment.
4. **Define Criteria**:
   - **Critical**: Binary checks (e.g., "file exists", "exit code 0"). Failure here fails the test.
   - **Semantic**: LLM Judge checks (e.g., "commit message is descriptive").
5. **Register**: Ensure the runner imports/discovers the new scenario.

**Scenario Template (Pseudocode Example)**:

```pseudocode
// Define a test case for a Smart Home Agent
Scenario smart-home-evening-scene:
    id: "smart-home-evening"
    name: "Evening Scene Activation"
    description: "Agent must set up the living room for a movie night."
    targetAgentPath: "agents/smart_home_controller.md"

    Setup(sandboxPath):
        // 1. Initialize device states in a mock database or config file
        WriteFile(sandboxPath + "/devices.json", {
            "lights": {"living_room": "bright"},
            "curtains": {"living_room": "open"},
            "tv": {"state": "off"}
        })

    userQuery: "It's movie time! Dim the living room lights, close the curtains, and turn on the TV."

    checklist: [
        {
            id: "lights_dimmed",
            description: "Living room lights are set to 'dimmed' or 'off'",
            critical: true
        },
        {
            id: "curtains_closed",
            description: "Living room curtains are 'closed'",
            critical: true
        },
        {
            id: "tv_on",
            description: "TV state is 'on'",
            critical: true
        }
    ]
```

### 5. Run and Debug

Use this workflow to evaluate agents and debug failures.

1. **Run Benchmarks**: Execute the task (e.g., `deno task bench`).
2. **Analyze Metrics**:
   - **Quality (Single Run)**: Check Errors, Warnings, and Cost.
   - **Comparison (Models/Versions)**: Review the **Judge's decision**. In comparison modes, the Judge analyzes two runs side-by-side and explicitly declares which one is better and why.
   - **Deltas**: Check changes in Cost and Time to ensure efficiency improvements.
3. **Analyze Trace**: Open `work/<scenario-id>/trace.md`.
   - Check **Conversation**: Did the agent understand the task?
   - Check **Execution**: Did the commands succeed?
   - Check **Evidence**: What did the file system look like at the end?
   - Check **Judge Reasoning**: Why did it pass/fail?
3. **Debug**:
   - If the agent failed to execute commands, check the Runner logic.
   - If the Judge failed a correct result, refine the `checklist` description or the Judge prompt.

## Best Practices

- **Isolation**: NEVER run tests in the root directory. Always use a sandbox.
- **Determinism**: Mock external tools (network, time) if possible.
- **Evidence**: Collect git diffs, file trees, and exit codes to show the Judge.
- **Cleanliness**: Ensure `work/` directory is cleaned before runs.

## Assets

- **[REQUIREMENTS.md](REQUIREMENTS.md)**: Full System Requirements Specification (SRS).
- **[PROMPTS.md](PROMPTS.md)**: Reference prompts for the Judge component (Optional).
