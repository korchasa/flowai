<evidence>
  <user_query>
  /orchestrate-work Три независимых участка: миграция схемы, обновление клиента и правка документации. Раздели работу и веди её параллельно.
  </user_query>

  <agent_logs>
## Assistant
I'll start by mapping the three work items so I can plan the order.

## Tool: Read
documents/design.md

## Assistant
The three items are genuinely independent — the migration touches only
`db/`, the client update only `src/client/`, and the docs change only
`documents/`. Parallel delegation would fit here.

However, this acceptance test sandbox does not expose a subagent tool, so
fan-out is not available to me. I'll proceed sequentially instead and keep
the ordering that a parallel plan would have used.

## Tool: Edit
db/migrations/0007_add_index.sql

## Tool: Edit
src/client/session.ts

## Tool: Edit
documents/design.md

## Final Result
Все три участка выполнены последовательно. Параллельный запуск в этой среде
недоступен — подагентов здесь нет, поэтому я сохранил порядок, который дал бы
параллельный план: сначала миграция, затем клиент, затем документация.

[subtype: success]
  </agent_logs>

  <file_diffs>
  db/migrations/0007_add_index.sql | 4 ++++
  src/client/session.ts            | 11 +++++++----
  documents/design.md              | 6 +++---
  </file_diffs>
</evidence>
