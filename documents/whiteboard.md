# Множественные whiteboards для параллельных сессий

## Goal

Позволить нескольким агентам/сессиям работать параллельно без конфликтов за единый whiteboard.md. Сейчас два параллельных `/flow-plan` перезаписывают один файл, что приводит к потере планов.

## Overview

### Context

- `documents/whiteboard.md` — единственный файл для временных заметок и планов (GODS-формат)
- Захардкожен в 7 framework-скиллах: flow-plan, flow-answer, flow-review, flow-init, flow-spec, flow-maintenance, flow-review-and-commit
- Упоминается в: `AGENTS.md`, `documents/CLAUDE.md`, `documents/.gitignore`
- ~10 benchmark-сценариев проверяют работу с whiteboard.md
- Файл gitignored — не трекается в git
- @documents/CLAUDE.md — определяет иерархию документов и формат whiteboard
- @AGENTS.md:88 — Planning Rules, Plan Persistence

### Current State

Один файл `documents/whiteboard.md`. Все скиллы пишут в него напрямую по фиксированному пути. При параллельном запуске агентов — race condition и потеря данных.

Затронутые файлы (framework — продуктовые):
- `framework/skills/flow-plan/SKILL.md` — 6 упоминаний
- `framework/skills/flow-answer/SKILL.md` — 4 упоминания
- `framework/skills/flow-review/SKILL.md` — 1 упоминание
- `framework/skills/flow-init/SKILL.md` — 1 упоминание
- `framework/skills/flow-spec/SKILL.md` — 1 упоминание
- `framework/skills/flow-init/assets/AGENTS.template.md` — в шаблоне для новых проектов
- `framework/skills/flow-init/assets/AGENTS.documents.template.md` — шаблон documents/CLAUDE.md

Затронутые файлы (dev/infra):
- `AGENTS.md` — Plan Persistence rule
- `documents/CLAUDE.md` — иерархия, формат
- `documents/.gitignore` — паттерн игнора
- `.claude/skills/flow-*/SKILL.md` — локальные копии (генерируются flowai)
- `framework/skills/flow-plan/benchmarks/*/mod.ts` — 5 сценариев
- `framework/skills/flow-init/benchmarks/brownfield/mod.ts`
- `framework/skills/flow-maintenance/benchmarks/basic/mod.ts`

### Constraints

- Фреймворк должен оставаться IDE-агностичным (Cursor, Claude Code, OpenCode)
- Скиллы не могут полагаться на IDE-специфичные механизмы получения session ID
- Формат GODS должен сохраняться
- Gitignore должен покрывать все whiteboards
- Benchmark TDD: изменения скиллов требуют обновления/создания benchmark-сценариев
- Обратная совместимость: существующие проекты с `documents/whiteboard.md` не должны ломаться

## Definition of Done

- [ ] Каждая сессия/агент может создать свой whiteboard-файл без конфликтов
- [ ] Все framework-скиллы обновлены для поддержки множественных whiteboards
- [ ] documents/CLAUDE.md обновлён (иерархия, формат, правила)
- [ ] AGENTS.md Plan Persistence rule обновлён
- [ ] .gitignore покрывает все whiteboard-файлы
- [ ] flow-init шаблоны обновлены
- [ ] Benchmark-сценарии обновлены для новой схемы
- [ ] Старый `documents/whiteboard.md` не ломает проекты (gitignore чистый)

## Solution

**Выбран Variant B:** `documents/whiteboards/<YYYY-MM-DD>-<slug>.md`

### Шаг 1: Обновить документацию формата (documents/CLAUDE.md шаблон)

**Файл:** `framework/skills/flow-init/assets/AGENTS.documents.template.md`

Заменить секцию `## Whiteboard`:
- Путь: `documents/whiteboard.md` → `documents/whiteboards/<YYYY-MM-DD>-<slug>.md`
- Добавить правило именования: дата + slug из задачи (kebab-case, ≤40 символов)
- Добавить: "Один файл = один план/задача. Не переиспользовать чужие whiteboards."
- Оставить формат GODS без изменений
- Убрать "Clean up after session" — файлы накапливаются, это нормально (gitignored)

**Файл:** `documents/CLAUDE.md` (dev-копия для этого проекта) — аналогичные изменения.

### Шаг 2: Обновить AGENTS.md шаблон

**Файл:** `framework/skills/flow-init/assets/AGENTS.template.md`

Строка 50 (Plan Persistence):
```
- **Plan Persistence**: After variant selection, save the detailed plan to `documents/whiteboards/<date>-<slug>.md` using GODS format. Chat-only plans are lost between sessions.
```

**Файл:** `AGENTS.md` (dev-копия) — аналогично.

### Шаг 3: Обновить framework-скиллы

#### 3.1 flow-plan/SKILL.md

Заменить все `documents/whiteboard.md` на `documents/whiteboards/<YYYY-MM-DD>-<slug>.md`:
- Overview: "Create a clear, critiqued plan in `./documents/whiteboards/` using the GODS framework."
- Rule 1 (Pure Planning): "MUST NOT write into any file except a single whiteboard in `./documents/whiteboards/`. Name: `<YYYY-MM-DD>-<slug>.md` where slug is derived from the task (kebab-case, ≤40 chars). Examples: `2026-03-24-add-dark-mode.md`, `2026-03-24-fix-auth-bug.md`, `2026-03-24-refactor-db-layer.md`. If the directory does not exist, CREATE it."
- Step 3 (Draft G-O-D): "Create ... in `documents/whiteboards/<date>-<slug>.md`"
- Step 5, 7: аналогично
- Verification: "ONLY one file in `./documents/whiteboards/` modified."

#### 3.2 flow-answer/SKILL.md

- Overview: "save detailed analysis to a file in `documents/whiteboards/`"
- Rule 2: "Keep all repository files unchanged (except files in `documents/whiteboards/`)."
- Step 5: "save detailed analysis to `documents/whiteboards/<date>-<slug>.md`"
- Verification: аналогично

#### 3.3 flow-review/SKILL.md

- Строка 30: "The Plan (task management tool or a whiteboard in `documents/whiteboards/`)."

#### 3.4 flow-init/SKILL.md

- Строка 150-152: Убрать явное создание `documents/whiteboard.md`. Не создавать директорию `documents/whiteboards/` — она будет создана автоматически при первом вызове скилла (flow-plan, flow-answer и т.д.).
- Brownfield: записать "Discovered Context" в `documents/whiteboards/<date>-init-context.md` (это автоматически создаст директорию)

#### 3.5 flow-spec/SKILL.md

- Строка 21: "start with `flow-plan`; if it outgrows a whiteboard, upgrade to `flow-spec`"

#### 3.6 flow-review-and-commit/SKILL.md

- Обновить аналогично flow-review (grep подтвердил наличие упоминания whiteboard)

#### 3.7 flow-maintenance/SKILL.md

- Обновить все упоминания `documents/whiteboard.md` → `documents/whiteboards/<date>-<slug>.md`

### Шаг 4: Обновить .gitignore

**Файл:** `documents/.gitignore`

Заменить:
```
whiteboard.md
```
На:
```
whiteboards/
```

Это покрывает всю директорию. Старый `whiteboard.md` убрать — он больше не создаётся скиллами. Если у кого-то остался — просто лежит, не мешает.

### Шаг 5: Обновить benchmark-сценарии

Все сценарии, проверяющие `documents/whiteboard.md`, обновить.
Description — это prompt для LLM-judge (semantic check), не код. Заменить текст описания на `documents/whiteboards/`.
- Затронутые файлы:
  - `framework/skills/flow-plan/benchmarks/basic/mod.ts` — id "whiteboard_created"
  - `framework/skills/flow-plan/benchmarks/variants-complex/mod.ts` — id "whiteboard_created"
  - `framework/skills/flow-plan/benchmarks/variants-obvious/mod.ts` — id "whiteboard_created"
  - `framework/skills/flow-plan/benchmarks/interactive/mod.ts` — id "solution_filled"
  - `framework/skills/flow-plan/benchmarks/context/mod.ts` — id "whiteboard_context"
  - `framework/skills/flow-plan/benchmarks/refactor/mod.ts` — id "no_implementation"
  - `framework/skills/flow-init/benchmarks/brownfield/mod.ts` — id "documents_folder_created"
  - `framework/skills/flow-maintenance/benchmarks/basic/mod.ts` — id "whiteboard_report"

Description в checklist items обновить: упоминание `'documents/whiteboard.md'` → `'documents/whiteboards/'`.

### Шаг 6: Обновить .claude/skills/ (dev-копии)

Запустить `flowai` (или вручную скопировать) обновлённые framework-скиллы в `.claude/skills/`.

### Шаг 7: Верификация

1. `deno fmt && deno lint` — без ошибок
2. `deno test` — все тесты проходят
3. Grep по `documents/whiteboard.md` в framework/ — 0 результатов (кроме обратной совместимости)
4. Запустить benchmarks для flow-plan: `deno task benchmark flow-plan`
5. Запустить benchmarks для flow-init: `deno task benchmark flow-init`

### Порядок выполнения

1. documents/.gitignore (Шаг 4)
2. documents/CLAUDE.md + AGENTS.md шаблоны (Шаги 1-2)
3. framework skills по очереди (Шаг 3) — каждый с benchmark RED-GREEN
4. Benchmarks (Шаг 5) — параллельно с Шагом 3
5. Dev-копии (Шаг 6)
6. Финальная верификация (Шаг 7)
