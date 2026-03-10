# Отчёт о техническом обслуживании (2026-03-09)

Автоматизированный 7-фазный аудит проекта AssistFlow. Исправления выполнены 2026-03-10.

---

## 1. Структурные проблемы

- [x] ~~hooks symlink-и в `.claude/` и `.opencode/`~~: Hooks — Cursor-only by design (design.md:48-50). Не является проблемой.
- [ ] **`.opencode/` содержит `node_modules/`, `bun.lock`, `package.json`**: Bun вместо Deno — требует оценки (OpenCode SDK requirement?).
- [x] **`.DS_Store` файлы**: Удалены из git tracking.
- [ ] **`.cursorignore` почти пуст**: Содержит только `!./tmp/**`. Низкий приоритет.

---

## 2. Гигиена и качество кода

- [x] **`scripts/benchmarks/lib/trace.ts`**: Рефакторинг выполнен. Метод `render()` (1 018 строк) разбит на 7 приватных методов: `computeGroups()`, `renderDashboard()`, `renderDashboardRows()`, `renderScenarioDetail()`, `renderToC()`, `renderCSS()`, `renderJS()`. `render()` теперь ~30 строк (оркестратор). Добавлен модульный JSDoc.
- [ ] **`scripts/benchmarks/lib/runner.ts` → `runScenario()`**: ~367 строк. Рефакторинг отложен (требует отдельной итерации).
- [ ] **`scripts/install.ts`**: 760 строк — приемлемо для CLI-оркестратора. Без действий.

---

## 3. Технический долг

- [ ] **Проваленный бенчмарк `flow-maintenance-basic`** (`documents/benchmarking.md:78`): Навык пропускает TODO в фикстуре. Требует отладки.
- [ ] **Проваленный бенчмарк `flow-init-brownfield`** (`documents/benchmarking.md:68`): Файлы не создаются в sandbox.
- [x] **`@deprecated systemInstructionsTemplate`**: Удалено из `types.ts` (не использовалось нигде).
- [ ] **`@deprecated commandPath`** в `spawned_agent.ts`: Оставлен — активно используется в тестах. Удаление требует миграции тестов на adapter-паттерн.

---

## 4. Консистентность (документация ↔ код)

- [x] **`documents/design.md:88-90` — секция 3.3**: Заполнена (Project Documentation — hierarchy, rules, deps).
- [x] **`documents/design.md:92-112` — секция 3.4**: Заменена на "Benchmark System" (вместо фикстуры User Management).
- [x] **README.md**: Добавлены 2 пропущенных навыка (`flow-skill-cursor-agent-integration`, `flow-skill-setup-ai-ide-devcontainer`).
- [ ] **`.dev/agents/` не описаны в design.md**: Низкий приоритет.

---

## 5. Покрытие документацией кода

- [x] **`framework/AGENTS.md`**: Создан (responsibility, key decisions).
- [x] **`benchmarks/AGENTS.md`**: Создан (responsibility, key decisions).
- [x] **`.dev/AGENTS.md`**: Создан (responsibility, key decisions).
- [x] **`scripts/task-bench.ts`**: Добавлен модульный JSDoc.
- [x] **`scripts/benchmarks/lib/trace.ts`**: Добавлен модульный JSDoc + JSDoc на все методы.
- [x] **`scripts/benchmarks/lib/spawned_agent.ts`**: Добавлен JSDoc на `getSessionId()`, `getMessages()`.
- [ ] Адаптеры `cursor.ts`, `claude.ts` — методы без JSDoc. Низкий приоритет.
- [ ] 40 файлов сценариев бенчмарков без модульного JSDoc. Системное — решается через шаблон в flow-engineer-skill.

---

## Оставшиеся задачи (backlog)

- [ ] Рефакторинг `runner.ts` → `runScenario()` (367 строк)
- [ ] Миграция тестов `spawned_agent.test.ts` с `commandPath` на adapter
- [ ] Отладка failing бенчмарков (`flow-maintenance-basic`, `flow-init-brownfield`)
- [ ] JSDoc для адаптеров и сценариев бенчмарков
- [ ] Описание `.dev/agents/` в design.md
