# IDE Built-in Tools

## Cursor

### File Operations & Code Analysis
- `read_file`: Read file contents with optional line limits.
- `Write`: Create or overwrite files.
- `StrReplace`: Exact string replacement in files.
- `delete_file`: Remove files from the filesystem.
- `Glob`: Find files matching a pattern.
- `grep`: Search for text patterns using ripgrep.
- `codebase_search`: Semantic search across the codebase.
- `read_lints`: Check for linter errors in specific paths.

### System & Terminal
- `Shell`: Execute shell commands (git, deno, npm, etc.).

### Planning & Task Management
- `todo_write`: Manage a structured task list for the session.
- `Task`: Launch specialized sub-agents (explore, shell, etc.).
- `SwitchMode`: Switch to Plan mode for architectural discussions.

### Interaction & Information
- `AskQuestion`: Gather structured feedback via multiple-choice questions.
- `web_search`: Search the web for real-time information.
- `WebFetch`: Fetch and convert web content to Markdown.
- `generate_image`: Create images from text descriptions.

## Claude Code

### File Operations & Code Analysis
- `Read`: Read file contents with optional line offset/limit. Supports images, PDFs, Jupyter notebooks.
- `Write`: Create or overwrite files.
- `Edit`: Exact string replacement in files (with `replace_all` option).
- `Glob`: Fast file pattern matching (e.g., `**/*.ts`, `src/**/*.tsx`).
- `Grep`: Content search using ripgrep with regex, glob/type filters, and output modes (`content`, `files_with_matches`, `count`).
- `NotebookEdit`: Edit, insert, or delete cells in Jupyter notebooks.

### System & Terminal
- `Bash`: Execute shell commands with optional timeout and background mode.

### Planning & Task Management
- `EnterPlanMode`: Transition to plan mode for exploring codebase and designing implementation.
- `ExitPlanMode`: Signal plan completion and request user approval.
- `TaskCreate`: Create structured tasks with subject, description, and activeForm.
- `TaskGet`: Retrieve full task details by ID.
- `TaskUpdate`: Update task status, dependencies, or details.
- `TaskList`: List all tasks with summary info.
- `Task`: Launch specialized sub-agents (Bash, Explore, Plan, general-purpose, etc.).
- `TaskOutput`: Retrieve output from background tasks.
- `TaskStop`: Stop a running background task.

### Interaction & Information
- `AskUserQuestion`: Gather structured feedback via multiple-choice questions (1-4 questions, 2-4 options each).
- `WebSearch`: Search the web for real-time information.
- `WebFetch`: Fetch URL content and process it with AI.
- `Skill`: Execute a registered skill by name.

## OpenCode

### File Operations & Code Analysis
- `read`: Read file or directory content with offset/limit.
- `glob`: Find files by glob pattern.
- `grep`: Search file content using regex.
- `apply_patch`: Apply structured file patches (add/update/delete).

### System & Terminal
- `bash`: Execute shell commands with timeout and workdir.

### Planning & Task Management
- `todowrite`: Manage a structured task list.
- `task`: Launch subagents (`general`, `explore`, `flow-*`).
- `skill`: Load and execute registered skills.
- `parallel`: Run independent tool calls concurrently.

### Interaction & Information
- `question`: Ask structured multiple-choice questions.
- `webfetch`: Fetch URL content (`markdown`, `text`, `html`).

### Notes
- List reflects built-in tool catalog in this OpenCode session.
- MCP tools are intentionally excluded from this section.
