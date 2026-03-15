---
name: flow-skill-manage-github-tickets-by-mcp
description: How to manage GitHub tickets via MCP tools using the GODS framework. Use when creating, updating, or triaging GitHub issues.
---

## HOW TO MANAGE GITHUB TICKETS BY MCP

- All tickets must be written according to the GODS framework (see `flow-skill-write-gods-tasks` for full details and examples).
- All tickets and messages must be in English.
- To manipulate tickets, use tools:
  - `add_issue_comment`
  - `create_issue`
  - `get_issue`
  - `get_issue_comments`
  - `list_issues`
  - `search_issues`
  - `update_issue`

## GODS Framework Summary

**Structure:**

- **Goal:** Why are we performing the task? What is the business goal?
- **Overview:** What is happening now? Why did the task arise? What is the surrounding context?
- **Definition of Done:** When do we consider the task completed? By what criteria?
- **Solution:** How can the task be solved?

## Where GODS Works Best

Applicable when:

- The goal of the task is clear.
- The context is clearly described.
- There are measurable criteria for completion.
- The executor is free to choose the solution.

Ideal for: incidents, operational DevOps tasks, infrastructure development, product team requests, business processes with clear outcomes, tool implementation, testing, change management, product launches.

Not effective for: innovative projects without clear outcomes, tasks with rapidly changing requirements, high-uncertainty processes requiring flexible management.

## Example

```markdown
**Goal:** Restore the CI/CD pipeline so deployment delays do not exceed 1 hour.

**Overview:** Updated Jenkins plugin → 5 builds with errors → version incompatible.

**Definition of Done:** All builds pass without errors within a day, tests ≥98% successful, team notified.

**Solution:** Roll back the plugin, patch, or change the tool after log analysis.
```

For more examples, see `flow-skill-write-gods-tasks`.
