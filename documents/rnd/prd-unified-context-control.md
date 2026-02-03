### [PRD] Unified Context Control System {Status: Draft}

#### 1. Executive Summary
- **Problem Statement**: AI coding tools use fragmented, incompatible ways to manage context (persistent rules, hooks, commands). This forces developers to rewrite configurations for each tool.
- **Proposed Solution**: A standardized set of file-based primitives for context control that works across all supported AI IDEs and CLI agents.
- **Value Proposition**: Write once, use everywhere. Reduces configuration overhead and ensures consistent agent behavior across different tools.

#### 2. Success Metrics (KPIs)
- **Primary Metric**: 100% compatibility with core primitives (Rules, Commands, Hooks) across 3+ major tools (Cursor, Claude Code, Antigravity).
- **Guardrail Metrics**: Configuration parsing time < 50ms. No increase in context token waste > 5%.

#### 3. Scope & User Stories
**Target Audience**: Developer - Uses multiple AI tools and wants consistent project norms.

| ID   | User Story | Acceptance Criteria | Priority |
| ---- | ---------- | ------------------- | -------- |
| US-1 | As a developer, I want a single `RULES.md` to define project norms so that any agent follows them. | 1. Support global, project, and folder-level rules.<br>2. Automatic merging logic (root to leaf). | P0 |
| US-2 | As a developer, I want to define custom slash commands in `.agent/commands/` so that I can run complex workflows. | 1. Support argument substitution.<br>2. Support frontmatter metadata (description, tools). | P0 |
| US-3 | As a developer, I want to trigger scripts before/after agent actions so that I can automate linting or logging. | 1. Define hooks in `settings.json`.<br>2. Support shell command execution. | P1 |

**Out of Scope**:
- Tool-specific UI elements (e.g., custom sidebars).
- Proprietary model fine-tuning.

#### 4. Functional Requirements
- **Persistent Instructions**:
  - Global: `~/.config/ai/RULES.md`
  - Project: `./RULES.md`
  - Folder: `**/RULES.md`
  - Merge: Concatenate from global to folder. Later rules override earlier ones.
- **Conditional Instructions**:
  - Use `.ai/rules/*.md` with YAML frontmatter for `globs` and `description`.
- **Custom Commands**:
  - Path: `.ai/commands/*.md`.
  - Format: Markdown with YAML frontmatter for `argument-hint` and `allowed-tools`.
- **Event Hooks**:
  - Config: `.ai/settings.json`.
  - Events: `pre-command`, `post-command`, `on-error`.
- **Context Ignoring**:
  - Use `.aiignore` file (standard glob patterns).

#### 5. Non-Functional Requirements
- **Performance**: Agent must scan and index control files in < 100ms on startup.
- **Security**: Hooks must prompt for user confirmation before executing arbitrary shell scripts.
- **Compatibility**: Must fallback gracefully if a specific primitive (like MCP) is not supported by the host tool.

#### 6. User Experience (UX)
- **Flow**:
  1. User adds `RULES.md` to project root.
  2. Agent detects file and applies instructions to all prompts.
  3. User types `/` to see autocompleted list of commands from `.ai/commands/`.
- **UI Elements**: Autocomplete for slash commands, status indicator for active rules.

#### 7. Dependencies & Risks
- **Dependencies**: Requires host tools to support local file reading and shell execution.
- **Risks**: Conflicting instructions between global and local files.
- **Mitigation**: Clear "effective instructions" view for debugging.

#### 8. Open Questions
- How to handle tool-specific MCP configurations in a unified way?
- Should we support `.local` overrides for every primitive to keep personal notes out of git?
