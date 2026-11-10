---
date: "2026-11-10"
status: in progress
implements: [FR-SWARM, FR-PACKS, FR-ACCEPT.TRIGGER]
tags: [swarm, sessions, skills]
related_tasks: [2026/11/session-goal-check-and-finish.md]
---
# Swarm management skills: one manager session, many child sessions [ANC:task:2026-11-swarm-management-skills]

## Goal

The operator runs work as a swarm: one manager session starts child sessions, watches them, keeps them in step, redirects them and closes them. Today every one of those acts is improvised, and the operator cannot tell what state a child is in, what it finished, what is left and which follow-ups it named. A set of skills gives the swarm one working cycle and one always-current picture of its state, so the operator spends attention on decisions instead of on reconstructing status.

## Overview

### Context

User request, 2026-11-10: a set of skills for managing a swarm — a manager session and the child sessions it creates, controls, synchronises, steers and finishes; derive the working cycle and the operator's gaps from the session transcripts of both Claude config roots. The stated top pain: it is unclear what state a session is in, what is done, what is left, which follow-ups exist.

Transcript study, 2026-11-10 (three independent passes; scripts and intermediate data under the session scratch directory, not kept). Swarm use spans 2026-10-15 .. 2026-11-09 in both roots.

Scale:

- Personal root: 65 manager sessions started 202 children in 27 days. Work root: 50 managers started 131 children in 3.5 weeks.
- Half of the managers have 1 child; 26 of 115 have 3-8; 13 have 10-27. Up to 12 children work at once; up to 31 are linked to one manager.
- A child lives a median of 41-50 minutes; the 90th percentile in the work root is 51 hours.

Observed working cycle:

1. The operator orders delegation in words (137 of 183 starts in the work root; 58 of 65 managers in the personal root). The manager rarely delegates by itself, and 46 start calls were refused or left as an unclicked proposal card.
2. Brief: median 1.9k-2.4k characters plus a background field, always a fresh context, never a fork. 74% of work briefs ask for a final report, 57% give acceptance criteria.
3. Checkout: only 51 of 333 children got their own worktree; the rest share one checkout.
4. The manager learns of a turn end from a host note that quotes the first 400 characters of the child's report. 591 of 1117 such notes were cut; 254 personal-root notes were progress pings under 120 characters.
5. The manager polls on top of the notes: 817 calls that read a child's tail, 74 that list sessions.
6. Steering: 414 messages sent to children. The operator also types directly into children (110 of 198 personal children, 62 of 125 work children), so the manager's picture is stale by construction.
7. Integration: the operator merges merge requests by hand and reports it ("влил 26"); in other repositories the manager merges child branches on command.
8. Closing happens only on an operator command, and managers archived 115 of 333 children (35%).

Measured pains, most frequent first:

- **State is rebuilt for every question.** The operator asked about state in 47 manager sessions, and in 30 of the 44 managers with three or more children. One answer costs a median of 6 tool calls and 51 seconds, up to 49 calls and 27 minutes, and 2.3k characters of prose that nothing keeps. One manager was asked three times in 23 minutes and failed twice on context overflow.
- **The host's status word cannot answer the question.** "Idle" covers done, blocked, abandoned and waiting for a merge, so 42 of 50 work-root answers needed git and merge-request checks.
- **A child's report has no shape, and the visible part hides what matters.** In the first 400 characters: follow-ups appear in 4% of reports, "not done" in 9%, "not verified" in 5%, "needs the operator" in 1%. In full reports: follow-ups 20-31%, not done 48%, pushed-or-merged state 30-33%.
- **Children wait for the operator unseen.** Of 257 child questions, 31 waited over 30 minutes and 12 over 3 hours; 8 "needs the user" states were never resolved. Children also stall silently when a background job outlives their turn (one for 13 hours).
- **A shared checkout collides.** 45 manager sessions mention foreign uncommitted edits; children swallowed, overwrote or deleted each other's work, and the operator calls it "эта проблема постоянная".
- **Closing leaves leftovers.** 65% of children never archived by their manager, 10 never-merged branches found a week later, 5 to 17 worktrees left behind, 93 turn-end notes reporting unpushed or uncommitted work. Follow-ups live only in child reports and vanish with the session.
- **The manager forgets.** 86 of 115 managers compacted after starting children; the list of children survives, their purposes and decisions do not.
- **No map from goal to session.** "А какая сессия делала AD-914?" costs transcript searches; the only link is a ticket id typed into the session title.
- **Children start children.** 32 children started 53 grandchildren; the operator: "Как-то они перемешались". Nesting also blocks archiving.
- **Reports are relayed unchecked.** 37% of work-root reactions to a turn-end note repeat the excerpt with no tool call.
- **The manager does the work itself** (about 7 personal managers): "А эта сессия - командует".
- **Limits.** 40 work transcripts hit the session limit; fan-outs of 10-13 children in two minutes preceded two of them.

Operator workarounds already in use: a personal `/child` skill that builds a self-contained brief; an urgency prefix `!`..`!!!!!` plus a ticket id in session titles; the phrases "проверь дочерние сессии", "закрой завершенные сессии", "дефрагментируй сессии"; a "тебе дальше" block of at most three items with links to the sessions that need the operator; a shared plan page; a per-project close ritual; forking the manager only to ask for a summary.

### Current State

- The framework has no primitive that starts, tracks or closes another session. `framework/core/skills/` holds single-session workflows (`plan`, `implement`, `review`, `commit`, `push`, `check-goals`, `finish-session`, `epic`, `tasks-overview`).
- `finish-session` (FR-FINISH-SESSION) closes one session: goal check, commit, push, archive. `check-goals` (FR-ATOM-CHECK-GOALS) reports met / not met / not verified for one session's goals.
- `epic` writes multi-session phases and tasks but does not execute them.
- The `beta` pack, removed on 2026-11-10 for zero skill loads in 30 days, held `delegate-to-ide` and `ai-ide-runner` — delegation to another IDE's command line, not management of sibling sessions.
- Session-control tools (start, list, read the tail, send a message, stop, archive) exist only in the Claude desktop app. Claude Code CLI, Cursor, OpenCode and Codex have none; the acceptance-test sandbox drives a CLI.
- Packs ship through `DEFAULT_PACKS` in `scripts/build-plugins.ts`; `swarm` is not among them.

### Constraints

- Framework text is host-neutral: no tool name of a single IDE without an "e.g." framing; a skill that needs a missing capability says so in one line and stops or degrades.
- Every skill ships execution scenarios plus exactly three trigger scenarios; a scenario runs in a sandbox with no sibling sessions.
- Bundled scripts are Python 3, standard library only, and must not spell out this repository's documentation layout.
- Shipped skills carry no `disable-model-invocation`; descriptions name the neighbouring primitive each skill is NOT for.
- A manager may not answer a child's question on the operator's behalf, and may not start sessions on a turn the operator did not start.
- Skill selection degrades as the catalogue grows; four packs were deleted for non-use on 2026-11-10.

### Affected Surface

Scout report, verbatim:

~~~~text
## Surface

Короткий вывод: рой в вашей практике уже существует, но он держится на ручных приёмах оператора и самого менеджера-агента. Готового набора скилов нет ни в flowai, ни в личных каталогах. Транскрипты лежат в `~/.claude` (366 папок проектов) и `~/.claude-work/projects` (50). Каталога `~/claude-work` не существует, я читал `~/.claude-work`.

**A. Что в проекте flowai уже есть**
- Скилов для роя в flowai нет. Пакеты `core`, `devtools`, `engineering` содержат `epic`, `plan`, `ship`, `ship-task`, `finish-session`, `tasks-overview`, `reflect-by-history` и другие, но ни один не создаёт и не ведёт дочерние сессии — [framework/core/skills](/Users/korchasa/www/flowai/flowai/framework/core/skills), [framework/devtools/skills](/Users/korchasa/www/flowai/flowai/framework/devtools/skills), [framework/engineering/skills](/Users/korchasa/www/flowai/flowai/framework/engineering/skills). Поиск по `swarm|child session|start_session|ccd_session|cross-session` в `documents/requirements.md`, `documents/design.md`, `AGENTS.md`, `README.md`, `framework/composites.yaml` ничего по теме не дал. Единственное совпадение, `requirements.md:1901`, относится к бенчмарку.
- `epic` (`framework/core/skills/epic/SKILL.md`) — задаёт фазы и задачи на несколько сессий, но не исполнение. Это естественный источник плана для менеджера.
- `tasks-overview` и `scripts/project-status.py` — сводка по файлам задач, а не по живым сессиям.
- `finish-session` — закрывает одну сессию, а не рой.
- Место нового набора по правилам проекта: новый пакет или `framework/core/skills/<name>/SKILL.md`. Нужны сценарии приёмки (`acceptance-tests/`), записи в SRS/SDS (`FR-*`), `framework/composites.yaml` при составных скилах, `README` §Packs, SDS §3.0. Все эти места затронуты. Для сценариев приёмки сложность в том, что инструменты `mcp__ccd_session*` есть только в десктопном приложении Claude (вкладка Code). В песочнице бенчмарка их, скорее всего, нет (не проверял).

**B. Что уже есть вне flowai (первичные источники по рабочему циклу)**
- `/Users/korchasa/.claude/skills/child/SKILL.md` и копия в `~/.claude-work/skills/child` — скил `/child`. Он запускает одну дочернюю сессию через `mcp__ccd_session__start_session` с самодостаточным брифом. Отключён для модели (`disable-model-invocation: true`). Это единственный «создатель» в наборе. Контроля, синхронизации и завершения нет. Только для десктопа.
- Инструменты управления, которые реально использовались (число вызовов по транскриптам обоих корней): `mcp__ccd_session__start_session` (1802), `mcp__ccd_session_mgmt__list_events` (2597), `get_usage` (3139), `set_session_title` (3380), `list_sessions` (931), `get_session` (840), `archive_session` (890), `send_message` (589), `stop_session` (154), `search_session_transcripts` (265), `detach_session` (56), `set_session_effort` (58), `set_session_model` (35), `set_session_permission_mode` (26). Также `hand_off_to_session` (15441 упоминаний), `spawn_task` (8925), `mark_chapter`, `dismiss_task`. Цифры включают списки инструментов в системных подсказках, поэтому как точные частоты использования их брать нельзя.
- Рабочий роевой опыт — в `~/.claude-work/projects/-Users-korchasa-www-4ra-opsbrain/`. Это эталонные транскрипты менеджера:
  - `b628fd96-cd2b-4387-84d4-f96fa1e31cae.jsonl` — менеджер эпика ADP-91 (apple prod): 10 запусков, 166 вызовов `list_events`, 27 архиваций.
  - `d36da422-b6d2-4ebb-a591-4b263042ac43.jsonl` — продолжение того же эпика.
  - `027a89d2-4c95-44c4-81da-031a9d4ef615.jsonl` — начало эпика: 32 запуска, 104 вызова `list_events`.
  - `5e43228a-01f7-4937-88f3-51b106c88467.jsonl` — закрытие multipart в traefik по кластерам через дочерние сессии.
  - `fe50c671-9d0c-4aa3-aa6b-74ab89bc986d.jsonl` — разбор Agent Harness, «рефакторинг сессий».
  - `08dd2055-2e86-4a94-a3bd-0a4bed0fae90.jsonl` — T-300 (grape prod): раздача общих правок нескольким дочерним через `send_message`.
  - `02ca8f03-c82b-43cc-9c9b-6f2667823dfb.jsonl` и `1f5387b1-e8a6-4c52-8796-ab969ec0ed72.jsonl` — сообщения между сессиями. В одном случае сессия сама разыскивает соседа через `search_session_transcripts`, чтобы договориться о застейдженном файле в общем индексе git.
  - `~/.claude-work/projects/-Users-korchasa-www-4ra-cli/b944e8dc-bff1-4a30-98d8-4f46e5f8b4a3.jsonl` — 12 запусков.
  - Другие проекты, где менеджеры тоже запускали сессии: `~/.claude/projects/-Users-korchasa-www-factory-projects-naoba` (306 упоминаний start_session, много субагентов), `-Users-korchasa-second-brain` (97), `-Users-korchasa-www-flowai-flowai` (70), `-Users-korchasa-www-flowai-ai-ide-cli` (27).
- Правила и скилы opsbrain, в которых уже решены куски проблемы:
  - [howto-name-sessions](/Users/korchasa/www/4ra/opsbrain/.claude/rules/howto-name-sessions/RULE.md) — заголовок сессии начинается с уровня срочности `!`…`!!!!!`; применяется и к заголовку дочерней сессии при `start_session`.
  - [opsbrain-session-status](/Users/korchasa/www/4ra/opsbrain/.claude/skills/opsbrain-session-status/SKILL.md) — собирает «Осталось на тебе» из файла задачи и хода сессии, делит на шаги агента и оператора. Работает только для одной сессии.
  - [opsbrain-handoff](/Users/korchasa/www/4ra/opsbrain/.claude/skills/opsbrain-handoff/SKILL.md) — выгружает самодостаточный промпт продолжения для новой сессии.
  - [opsbrain-close-stale-sessions](/Users/korchasa/www/4ra/opsbrain/.claude/skills/opsbrain-close-stale-sessions/SKILL.md) — догоняет закрытие уже завершённых сессий (`deno task find-unclosed-sessions`, оба корня конфигурации).
  - [opsbrain-session-task-stats](/Users/korchasa/www/4ra/opsbrain/.claude/skills/opsbrain-session-task-stats/SKILL.md) — типизация сессий (автоматическая, вопрос-ответ, контролируемая, совместная). Единица — сессия приложения `local_<uuid>`.
  - `howto-hand-off-to-operator`, `howto-parallel-worktrees` (дерево на задачу в `.worktrees/<ID>/<repo>/`, git изолирует ветки), `howto-session-scope`. Эти правила я не открывал целиком, смотрел только описание и начало.
  - [devops-watching-review-requests](/Users/korchasa/www/4ra/opsbrain/.claude/skills/devops-watching-review-requests/SKILL.md), строка 48 — событие уходит в дочернюю сессию через `start_session`.
- [flowai-hive](/Users/korchasa/www/flowai/flowai-hive) (приложение Royak) — задумано как пульт роя. В README сказано, что домен роя ещё не построен, а есть только оболочка: список сессий по домашним каталогам, расход токенов и стоимость, копилот с read-only инструментами. Записывающие инструменты (запуск, остановка, перенацеливание) запланированы за блокировкой Allow/Deny (`docs/srs.md:12`). Это возможный потребитель того же состояния, которое определят скилы, и параллельная реализация «вида на рой» (поверхность `docs/srs.md`, `docs/design.md`).

**C. Рабочий цикл менеджера, восстановленный по транскриптам**
1. Менеджер находит эпик в Jira и режет его на тикеты. Один тикет — одна дочерняя сессия, потом волны. Оператор просит «добавь волну 0 с приёмкой доделок» и «ADP-69 тоже».
2. Менеджер запускает детей в два шага. Сначала `start_session` с `initiation: "offer"` даёт карточку, где оператор выбирает ветку, модель и режим. Потом второй вызов с `proposal_id`, `prompt` и `background` пишет бриф. Тулза требует «не делай задачу здесь» и просит ответить одной строкой со ссылкой.
3. Заголовок ребёнка: `!!! ADP-143: инфраструктурные сервисы…`. Уровень срочности стоит первым, дальше идёт тикет.
4. Ревью и проверки менеджер отдаёт отдельным сессиям, не делает сам. Это прямое требование оператора: «Для проверок и ревью стартуй отдельные сессии, не делай сам». Оператор требует также: «Ты должен управлять порядком действий и разрешать трения».
5. Ребёнок отчитывается сам, сообщением `cross-session-message from=local_…`, когда его ход закончен. Типичный текст: «открыт MR !26», «выложен на prod», «проверен». Менеджер видит это как пользовательский ход.
6. Менеджер проверяет отчёт и сам читает хвост ребёнка через `list_events` (limit 3–6). Видит там только `[result] done (success), 44 turns` и состояние `running` или `idle`.
7. Менеджер решает: принять, переадресовать, отправить доработку через `send_message`. Общие правки рассылаются идентичным текстом по нескольким детям (T-300). Конфликты за общий git-индекс решаются письмом соседу.
8. Оператор делает то, что агент не может: влить MR, дать права, разблокировать 1Password, выполнить apply в Terraform, сходить на VPN. Менеджер пишет ему команды.
9. Менеджер ведёт страницу-трекер (Artifact на claude.ai), в каждом ответе выводит блок «Тебе дальше» (не больше 3 пунктов) со ссылками на сессии формата `[имя](#local_<id>)`, в которых нужно действие.
10. Закрытие: оператор говорит «19 и 20 слиты», «закрой завершённые», менеджер вызывает `archive_session` с причиной («Ревью закончено»), по 20+ раз за сессию. Потом менеджер пишет итоги в файл задачи и коммитит. `stop_session` почти не используется (154 упоминания против 890 у архива).

**D. Чего не хватает оператору (по прямым фразам и по поведению менеджера)**
- Нет единой карты состояния. Оператор снова и снова просит вручную: «Посмотри дочерние сессии, какие закончили, какие не закончили, какие этапы выполнены» (`d36da422`), «Напиши по каждой jira задаче что сделано и что осталось» (`b628fd96`), «что из полного списка задач не сделано?», «ок, что осталось не сделанным по текущим сессиям?» (`fe50c671`), «а что за задача image-wait?». Менеджер каждый раз собирает ответ заново через сотни вызовов `list_events`.
- Состояние сессии из приложения не различает «закончил» и «ждёт оператора»: `idle` + `done (success)` бывает и у завершённой, и у остановившейся на вопросе или на действии оператора. Вывод о причине остановки приходится делать по тексту последнего сообщения (по выводу `list_events` в `b628fd96`).
- Нет связи «сессия — тикет — этап — MR». Оператор спрашивает «А какая сессия делала AD-914 для бонусного кластера?» и «Найди сессию, которой это занималось» (план падает в MR 879). Единственная связка — заголовок сессии, в нём тикет вручную.
- Follow-up ребёнка теряются. Они живут в тексте его последнего сообщения и в его файле задачи, но не в структуре. Оператор просит: «закрой завершённые сессии и в "тебе дальше" пиши сессию, в которой нужно совершить действие».
- Оператору нужны прямые указания «что и где запустить», «отправь к сессиям, которые могут дать команды», «дай ссылки с готовыми переменными». Агент должен выдавать готовую команду, а не абстрактную задачу. Это требование есть в [howto-hand-off-to-operator](/Users/korchasa/www/4ra/opsbrain/.claude/rules/howto-hand-off-to-operator/RULE.md) для одной сессии, для роя оно не обобщено.
- Нет автоматической проверки отчёта ребёнка. Менеджер перепроверяет сам: в ADP-143 после отчёта «экспортер работает» менеджер написал «проверено мной после отчёта сессии…» (по сообщению в `b628fd96`). Протокол «отчёт — независимая проверка — принятие» не оформлен.
- Нет учёта расходов и бюджета на рой: `get_usage` вызван 3139 раз по упоминаниям, но в сводку он нигде не входит. У Royak есть расчёт стоимости по логам.
- Блокировки между детьми: общий индекс git (в `1f5387b1` ребёнок застейджил чужой файл), общие рабочие деревья, конфликт ссылок на номера строк (T-300). Решается ad hoc.
- Прерывания: многократно встречается «[Request interrupted by user]», то есть оператор перебивает менеджера, пока тот ходит по детям.
- Разбор по аккаунтам: рой идёт в рабочем аккаунте (`~/.claude-work`), а скилы `child` продублированы в обоих корнях вручную. Любой новый скил по роям должен ставиться в оба корня. Скилы flowai идут через плагин, отдельно от этого.
- Не хватает завершения роя: массовая архивация по условию («все, где итог принят»), выяснение «что осталось не закрытым» перед архивом. Менеджер делает это вручную, по 20+ вызовов.

**E. Побочные поверхности**
- Скилы-кандидаты, пересекающиеся по смыслу: `opsbrain-session-status` (одна сессия, нужен роевой аналог), `opsbrain-close-stale-sessions` (догоняет закрытие уже оконченных), `opsbrain-handoff` (передача контекста в новую сессию). Новый набор может переиспользовать их процедуры. Это развилка для плана, у вас есть правило проекта «reuse existing primitives».
- Субагенты внутри одной сессии (`Task`/`Agent`, `.claude/agents/`, транскрипты в `…/subagents/`, например в naoba и sandbox/naoba-exp-pictures) — другой механизм роя: нет `list_events`, нет `send_message`, результат возвращается синхронно. Набор скилов должен решить, покрывает ли он оба механизма. В проекте flowai есть `.claude/skills/diagnose-acceptance-run` и `framework/core/skills/investigate`, которые уже запускают субагентов, но роем не управляют (не открывал глубоко).
- Только Claude Code Desktop. В CLI нет `mcp__ccd_session*`, и скил `/child` об этом прямо говорит и останавливается. Для codex и других IDE аналога нет (`documents/ides-difference.md` — затрагивается, если набор заявлен как универсальный; правило проекта требует не привязываться к одной IDE).
- Корневая `CLAUDE.md` и пакеты `framework/` требуют сценариев приёмки для каждого скила. Для скилов, зависящих от десктопных инструментов, нужен либо мок MCP, либо ручная приёмка (`manual — <reviewer>`). Мок-механика статична (`Mocks are static` в AGENTS.md).

## Queries used
- `ls` корня flowai, `ls framework`, `ls framework/*/skills`; `ls ~/.claude/projects | wc -l`; `ls ~/.claude-work/projects`.
- `grep -rIl -iE "swarm|subsession|child session|spawn.*session|claude -p|hive"` по md/ts/yaml проекта flowai.
- Для каждой папки проекта в `~/.claude/projects`: `grep -l` по `tmux send-keys|claude -p|SendMessage|TaskOutput|TaskStop|Monitor`.
- `grep -rho 'mcp__ccd_session[a-z_]*__[a-z_]*'` и `"name":"mcp__ccd_session…"` по обоим корням — частоты инструментов.
- Питон-скрипты по JSONL: реальные `tool_use` с `ccd_session` по сессиям (топ менеджеров), реплики пользователя без служебных, пары `tool_use`/`tool_result` для `list_events`, `start_session`, `archive_session`.
- Чтение `~/.claude/skills/child/SKILL.md`, списков скилов в `~/.claude-work/skills`, `~/www/4ra/opsbrain/.claude/skills`, `~/www/factory/.claude/skills`; правил `howto-name-sessions`, `howto-parallel-worktrees`.
- `grep` по `documents/requirements.md`, `design.md`, `AGENTS.md`, `README.md`, `composites.yaml` на `swarm|child session|start_session|ccd_session|cross-session`.
- Чтение README и `docs/srs.md` в `/Users/korchasa/www/flowai/flowai-hive`.

## Not examined (budget)
- Транскрипты `~/.claude` по проектам naoba, second-brain, factory и flowai (кроме подсчёта запусков): реплики оператора там читал только поверхностно, фильтр по словам не дал строк. Возможны другие приёмы управления.
- Содержимое `get_usage`, `hand_off_to_session`, `spawn_task`, `dismiss_task`, `mark_chapter`: вызовы видел, а формат ответов и реальные кейсы не разбирал.
- Полный текст сообщений `send_message` и протокол `cross-session-message` (поля, отметки о завершении): видел только отдельные примеры.
- Ошибки инструментов управления сессиями (отказы, сломанные идентификаторы) в `tool_result` не искал.
- Файлы задач T-300 и T-333 (`2026-10-20-t-300-grape-prod-env-annotations.md`, `2026-10-27-t-333-swarm-role-existing-clusters.md` в `/Users/korchasa/www/4ra/opsbrain/documents/tasks/in-progress/`): имена видел, содержимое не открывал. T-333 по имени (`swarm-role`) относится к Docker Swarm, а не к рою сессий, но я это не проверил.
- Правила `howto-hand-off-to-operator` и `howto-session-scope` целиком.
- Рабочее дерево `.claude/worktrees/*` в opsbrain и каталог `~/www/flowai/flowai-workflow` (DAG-движок агентов) не открывал. Это возможная параллельная реализация оркестрации.
- Не смотрел `tg-ide-bridge`, `ai-ide-cli`, `resumer`, `session-viewer`, `agentoscope` — родственные инструменты, которые могут читать те же транскрипты.
- Содержимое `~/.claude-work/plugins` и список плагинов с готовыми роевыми скилами не проверял.

## Could not rule out
- В `~/.claude/plugins` или `~/.claude-work/plugins` может лежать плагин с роевыми скилами. Видел только `flowai-workflow` и `djinni` по инструкции.
- Оператор мог раньше уже решать «состояние сессии» другим способом. Явного признака в просмотренных транскриптах нет, но `opsbrain-session-analytics` упоминает `start_session` (файл `/Users/korchasa/www/4ra/opsbrain/.claude/skills/opsbrain-session-analytics/SKILL.md`), и я его не читал.
- Формат состояния, который отдаёт приложение (`running`, `idle`), мог быть богаче, чем видно в моих примерах (например, статус ожидания вопроса к оператору). Это определяет, нужен ли слой, который выводит состояние из текста.
- Мог ли ребёнок вызывать `AskUserQuestion` так, что менеджер этого не видит (вопрос виден только в окне ребёнка), я не проверял. Но из отчётов видно, что такие остановки бывают («что и где запустить?»).
- Другие проблемы, о которых говорит оператор («скорее всего есть и другие»): перечисленное в разделе D выведено из транскриптов одного рабочего домена (4ra opsbrain). Для личных проектов (naoba, factory, flowai) картина может отличаться.
- Применимость на Linux, в CLI и для codex-стороны: не проверена, `mcp__ccd_session*` — только десктоп Claude.
~~~~

Dispositions for the selected variant (union of the planner's list and the scout's):

- Framework skill tree (`framework/<pack>/skills/`), the place of the new skills — covered-by Solution step 1 (new pack `swarm`)
- `framework/core/skills/epic` as the source of the manager's plan — not affected — `framework/core/skills/epic/SKILL.md` writes phases and tasks and is not edited; a manager may start from a task file an epic produced, and Solution step 2 names that as one of the ledger's sources
- `framework/core/skills/tasks-overview`, `scripts/project-status.py` (task files, not live sessions) — not affected — `framework/core/skills/tasks-overview/SKILL.md` reads task files only; the manager's and the children's task files are ordinary task files and appear in its output unchanged
- `framework/core/skills/finish-session`, `check-goals` (single-session close and goal check) — not affected — `framework/atoms/check-goals.md` and `framework/composites/finish-session.md` stay byte-identical; both swarm roles end with it unchanged: a child runs `finish-session` as its last step and the manager runs it after `close-swarm` (Solution steps 3 and 6, user decision 2026-11-10), so `close-swarm` restates none of its goal, commit or push checks, and its description names `finish-session` as the skill it is NOT for
- Acceptance scenarios for skills that need host session tools — covered-by Solution step 8 (file-side behaviour in the sandbox, live-host behaviour by manual acceptance)
- SRS, SDS, `documents/index.md`, README §Packs, SDS §3.0 — covered-by DoD item "documentation"
- `framework/composites.yaml` — not affected — the four skills are plain `SKILL.md` sources, no atom is composed
- `scripts/build-plugins.ts` `DEFAULT_PACKS`, `pack.yaml` — covered-by Solution step 1 and DoD item "pack"
- `documents/ides-difference.md` (which hosts expose session control) — covered-by DoD item "documentation"
- The operator's personal `/child` skill in both config roots — not affected — lives outside this repository (`~/.claude/skills/child/SKILL.md`); superseding it is the operator's own step, recorded under Follow-ups
- opsbrain rules and skills (`howto-name-sessions`, `opsbrain-session-status`, `opsbrain-handoff`, `opsbrain-close-stale-sessions`, `opsbrain-session-task-stats`, `howto-hand-off-to-operator`, `howto-parallel-worktrees`, `howto-session-scope`, `devops-watching-review-requests`, `opsbrain-session-analytics`) — not affected — another repository (`~/www/4ra/opsbrain/.claude/`); their procedures are input, their files are not edited
- `flowai-hive` (Royak app), a possible reader of the same swarm state — deferred — human choice (see Follow-ups: a machine-readable state layer is the next task)
- In-session subagents as a second swarm mechanism — deferred — human choice (see Follow-ups: out of scope, a subagent has no session of its own to track)
- Hosts without session control (CLI, Cursor, OpenCode, Codex) — covered-by DoD item "host without session control"
- `flowai-workflow`, `tg-ide-bridge`, `ai-ide-cli`, `resumer`, `session-viewer`, `agentoscope` — not affected — separate repositories; `flowai-workflow/README.md` lines 1-3 describe a YAML-defined graph that runs agent command lines to completion, a different mechanism from long-lived sibling sessions an operator talks to; the other five read transcripts or bridge chats and start no sessions (by their one-line descriptions in `~/www/CLAUDE.md`, not opened)
- Plugin directories of both config roots (a ready-made swarm plugin might exist) — not affected — the keys of `installed_plugins.json` in both roots, listed 2026-11-10, are the flowai packs, `flowai-workflow`, `djinni`, `foxcode`, `cloudflare`, `hindsight-memory`, `telegram` and Anthropic's official plugins (code-simplifier, feature-dev, playground, security-guidance, skill-creator, four language servers); none is a session-swarm plugin
- Cost and budget of a swarm (usage calls, cost per child) — deferred — human choice (see Follow-ups)
- A child's question asked in its own question window, invisible to the manager — covered-by Solution step 4 (the host's "needs the user" state overrides the written state) and the DoD item "live-host behaviour"
- The operator interrupting the manager while it walks the children — covered-by Solution step 4 (the board is one pass over files instead of a tool call per child)
- The manager doing the work itself; reviews and checks belong in separate sessions — covered-by Solution step 3 (manager rule) and step 6

## Definition of Done

- [x] FR-PACKS: pack — a new pack `swarm` exists, builds into its own plugin and passes plugin validation.
  - Test: `scripts/build-plugins_test.ts` (case for the `swarm` pack, to be authored)
  - Evidence: `deno task build-plugins > "$SCRATCH/build.log" 2>&1; ls dist/claude-plugins/plugins/flowai-swarm/skills | wc -l` prints 4, and `deno task validate-plugins` exits 0
- [x] FR-SWARM.START: Create — the manager starts a child with a brief that carries the goal, acceptance criteria, file ownership or an own worktree, what the child may not do, and the report contract; the child gets its own task file and a row in the manager's task file before it starts.
  - Benchmark: `start-child-writes-task-and-ledger-row`
  - Evidence: `deno task acceptance-tests -f start-child-writes-task-and-ledger-row`
- [x] FR-SWARM.STATUS: Control — the operator gets, on one request, the state of every child — a status that separates done, working, blocked on the operator, stalled and failed — with what is done, what is left, what is unverified and which follow-ups exist, without the manager rebuilding it from chat tails.
  - Benchmark: `children-status-board-from-task-files`, `children-status-marks-unverified-claims`
  - Evidence: `deno task acceptance-tests -f children-status`
- [x] FR-SWARM.REPORT: a child (or any single session) writes its state into its task file and opens its report with the state word, what it needs from the operator, and the counts of items left and unverified.
  - Benchmark: `session-status-writes-status-block`, `session-status-blocked-on-operator`
  - Evidence: `deno task acceptance-tests -f session-status`
- [x] FR-SWARM.LEDGER: Synchronise and steer — the manager's task file carries the rule that every decision sent to children is recorded under `## Decisions` with date and recipients; what the operator told a child directly reaches the board; the board names which child waits for which answer. Sending the message itself is the host's own tool, with no skill around it.
  - Benchmark: `start-child-writes-task-and-ledger-row` (the rule line is written at the head of `## Swarm`), `children-status-marks-unverified-claims` (a child's `Told directly by the operator` line is carried into the board), `children-status-board-from-task-files` (the "you next" block names the waiting child and its question)
  - Evidence: `deno task acceptance-tests -f start-child-writes-task-and-ledger-row`, `-f children-status-marks-unverified-claims`, `-f children-status-board-from-task-files` — three runs, each green
- [x] FR-SWARM.CLOSE: Finish — a child ends its own work with `finish-session` (goal check, commit, push, archive); closing a child accepts only a child that finished that way, records its follow-ups outside the session, settles its branch and worktree and marks its row closed; closing the swarm leaves no orphan session, branch or worktree unlisted and hands the manager's own final check and commit to `finish-session`.
  - Benchmark: `close-swarm-collects-follow-ups`, `close-swarm-refuses-unmerged-child`, `close-swarm-lists-leftovers`
  - Evidence: `deno task acceptance-tests -f close-swarm`
- [x] FR-SWARM.LEDGER: the manager's knowledge of its children survives context compaction — every swarm skill starts by reading the manager's task file and answers from it, never from memory of the conversation.
  - Benchmark: `children-status-board-from-task-files` (the scenario's session starts with no history; the board is correct from the files alone)
  - Evidence: `deno task acceptance-tests -f children-status-board-from-task-files`
- [x] FR-SWARM: host without session control — every skill says in one line what it cannot do there and still performs its file-side work.
  - Benchmark: `start-child-writes-task-and-ledger-row` (prints the ready brief for the operator to start by hand), `children-status-board-from-task-files` (sessions cannot be listed), `close-swarm-collects-follow-ups` (archiving unavailable)
  - Evidence: `deno task acceptance-tests -f start-child-writes-task-and-ledger-row`, `-f children-status-board-from-task-files`, `-f close-swarm-collects-follow-ups` — three runs, each green
- [ ] FR-SWARM: live-host behaviour — on a host with session control, start, message and archive act on real child sessions.
  - Acceptance: manual — korchasa (one swarm of three children on a scratch repository, one of them in its own worktree: start, status, broadcast, close; one child left waiting on a question and one stopped mid-work, to see `blocked on operator` and `stalled` on the board; the turn-end note of a child read to confirm it opens with the three status lines)
  - Evidence: the manager's task file of that run, linked from the SRS section
- [x] FR-ACCEPT.TRIGGER: each of the four skills has exactly three trigger scenarios and they pass.
  - Benchmark: `<skill>-trigger-pos-1`, `<skill>-trigger-adj-1`, `<skill>-trigger-false-1` for `start-child`, `children-status`, `close-swarm`, `session-status`
  - Evidence: `deno run -A scripts/check-trigger-coverage.ts` exits 0, and four runs pass — `deno task acceptance-tests -f start-child-trigger`, `-f children-status-trigger`, `-f close-swarm-trigger`, `-f session-status-trigger` (the filter is one substring of the scenario id)
- [x] FR-SWARM: documentation — add the `FR-SWARM` section and its five sub-sections (`.LEDGER`, `.START`, `.STATUS`, `.REPORT`, `.CLOSE`) to the SRS with `**Acceptance:**` and `**Rationale:**` filled; SDS, index rows, README §Packs, `framework/AGENTS.md` §Packs and `documents/ides-difference.md` describe the set.
  - Evidence: `grep -c "FR-SWARM" documents/requirements.md documents/design.md documents/index.md` is non-zero for each file; `grep -c "swarm" README.md framework/AGENTS.md documents/ides-difference.md` is non-zero for each file; `deno task check > "$SCRATCH/check.log" 2>&1; grep -E "passed \| [0-9]+ failed" "$SCRATCH/check.log"` shows 0 failed

## Solution

Selected on 2026-11-10: the full cycle on a swarm ledger, in a separate pack, with the user's addition that the ledger is the manager's task file — the project already has task files, and the manager session must keep one.

### The state model: task files, nothing new

- **The manager's task file is the swarm ledger.** It is an ordinary task file in the project's accepted task format under the `tasks` role. Its Goal and Definition of Done are the swarm's goal and outcomes. It may be a file the planning or epic workflow already produced; `start-child` creates one only when the manager has none.
- **Sections the swarm skills own in the manager's file** (plain bullets, never checkboxes, so task-status derivation is untouched):
  - `## Swarm` — one bullet per child: title, session reference, the child's task file path, branch and worktree, the DoD item(s) of the manager's file it serves, and `closed` once it is closed. The row holds links only: a child's state is read from the child's own file every time and is never copied here, so the two cannot drift and a status request leaves no uncommitted edit behind.
  - `## Decisions` — dated facts and decisions sent to children, each with its recipients.
  - `## Follow-ups` — the accepted format's own section; `close-swarm` moves every child's follow-ups here, each tagged with the child it came from.
- **Each child has its own task file**, written by `start-child` before the child starts, with `related_tasks:` pointing at the manager's file. What is done and what is left is the child's DoD checkbox state — the mechanism FR-DOC-TASK-LIFECYCLE already derives status from. What the child found for later is its `## Follow-ups`.
- **`## Status` in the child's file** carries what checkboxes cannot (plain bullets): `State:` one of `working`, `blocked on operator`, `done`, `failed`; `Needs from the operator:`; `Not verified:`; `Branch:` with pushed and merged state; `Told directly by the operator:`; `Updated:` date and time.
- **`stalled` is never written by a child.** The manager derives it: the child's state is `working` while its session is not running, or its `Updated:` is older than the session's last activity.
- **Where the files live and when they are committed.** `start-child` commits the child's task file and the new `## Swarm` row, by explicit paths, before it starts the session — a worktree is cut from a commit, so an uncommitted task file would not exist in it. A child in a shared checkout edits its task file in place and the manager reads the working tree. A child in its own worktree commits its task file, by explicit path, each time `session-status` updates it, and the manager reads it from the child's branch (`git show <branch>:<path>`); the brief states this rule.
- **The host's own state wins where it says more.** Where the host reports that a session waits for the user or has failed, the board shows that state whatever the child wrote.

### Steps

1. **Pack.** Create `framework/swarm/pack.yaml` (name `swarm`, description naming session control as the precondition) and `framework/swarm/skills/`. Add `swarm` to `DEFAULT_PACKS` in `scripts/build-plugins.ts`; grep the repository for the three existing pack names listed together (`core`, `devtools`, `engineering`) and extend every list found — the same places the 2026-11-10 pack removal touched. Keep `deno.json` `lint.exclude`, `fmt.exclude` and the `--ignore` flag of `scripts/task-check.ts` in step: their `framework/*/skills/*/acceptance-tests/` globs already cover a new pack; confirm with one run.
2. **`session-status`** (child side, useful in any single session). Reads the session's task file, updates `## Status`, and prints the report in a fixed order whose first three lines are the state word, what is needed from the operator, and the counts of DoD items left and of unverified claims — and the child's last message of every turn begins with those three lines, because a turn-end note quotes the beginning of that message. Whether the host's note really quotes the start of the last message is confirmed in the live-host run before the wording is frozen (step 10). Then: done, left, not verified, follow-ups, branch state. Edits only the task file, and commits it by explicit path when the session works in its own worktree. Works on every host. Description: NOT for the task list of the whole project (`tasks-overview`) and NOT for the goal verdict (`check-goals`).
3. **`start-child`** (manager side). Order of work: read or create the manager's task file; write the child's task file (goal, acceptance criteria as DoD items, constraints); add the `## Swarm` row and, the first time, the DoD item "Swarm closed: every child row is marked closed and the nothing-lost check of `close-swarm` is clean" to the manager's file, so that `finish-session` in the manager cannot pass while a child is open (user decision 2026-11-10: the manager's finish must not lose child work; `finish-session` itself stays unchanged and is not cascaded into running children); commit both files by explicit paths; build the brief; start the session with the host's session tool (e.g. a start-session tool); record the returned session reference in the row. The brief is assembled from a fixed checklist: the child's task file path; an own worktree, or the exact list of files the child owns in a shared checkout; what it may not do (merge, push to the main branch, start sessions of its own, answer for the operator); do not end a turn while background work is in flight; no progress-only turn ends; run `session-status` before every turn end; when every DoD item is checked, write the state `done` and finish with `finish-session`, which checks the goals against the task file, commits, pushes the child's branch and archives the session. Manager rule, stated in the skill: the manager delegates work, reviews and checks to children and keeps its own turns to planning, the ledger and decisions. Host without a session tool: do all the file work, print the brief as a ready block and say in one line that the operator starts the session by hand.
4. **`children-status`** (manager side). Starts from the manager's task file, never from conversation memory. For each `## Swarm` row: read the child's task file (from its branch when it has a worktree), count DoD items, read `## Status`, check the branch against the main branch (ahead, pushed, merged), and — where the host lists sessions — take the host's state: "waits for the user" and "failed" override the written state, and a written `working` on a session that is not running becomes `stalled`. Before the skill text is written, record what the host's session listing actually returns for a session waiting on a question (step 8, first bullet). Print the board grouped by state, `blocked on operator` first, and close with a "you next" block of at most three items, each a concrete action with a reference to the session that needs it. A claim taken from a child's file without a check of the manager's own is printed as "by the child's report". Description: NOT for one session's own report (`session-status`).
5. **Decisions without a skill.** Selected on 2026-11-10 after a redundancy pass: no skill wraps sending a message, because the manager already sends one with a single host call (414 such calls in the transcripts) and the only added value was the record. `start-child` writes one rule line at the head of `## Swarm` the first time it creates the section: every decision or fact sent to children is appended to `## Decisions` with date and recipients, and a changed assignment is also written into that child's task file. The manager rereads its task file after a context compaction and meets the rule there. The manager never answers a child's question on the operator's behalf: an open question goes to the board's "you next" block.
6. **`close-swarm`** (manager side; closes one named child, the finished ones, or all). Per child, in order: confirm the child finished — state `done`, every DoD item checked, and its work committed and pushed as far as git can prove — or leave the child open, list what is left and ask the child — with the host's message tool where there is one — to end its work by running `finish-session` (the goal check, the commit and the push are that skill's job and are not repeated here; no evidence command is re-run: a child's checks can take hours, and the transcripts hold 5 wrong reports in 333 children); mark every claim git cannot prove "by the child's report"; move the child's `## Follow-ups` into the manager's file; settle the branch — merged, or an explicit operator decision to drop or keep it; remove the worktree only after the branch is merged or dropped; mark the row closed; archive the session with the host's tool when `finish-session` in the child has not archived it already, or say in one line that the host cannot; commit the manager's file by explicit path. Nothing-lost check, run for every child on every close and printed as one list: uncommitted changes in the child's worktree, commits on its branch that are not pushed, a branch not merged, DoD items unchecked, follow-ups not yet moved, a session still open. After the last child: list every `## Swarm` row not closed, every unmerged branch and every remaining worktree, tick the manager's "Swarm closed" DoD item only when that list is empty, and say that the manager's own final check and commit is `finish-session` in the manager session — it checks the manager's DoD items and commits the ledger. Never archives a child whose state is `blocked on operator`. Description: NOT for closing the current single session (`finish-session`).
7. **Error handling.** A missing or unreadable child task file is a board row `state unknown` with the reason, never a silent skip. A host tool that refuses (start on a turn the operator did not start, archive of a busy session) is reported verbatim with the row left unchanged. A dirty shared checkout that blocks a close is reported with the paths, and nothing is stashed.
8. **Acceptance scenarios** (RED before each `SKILL.md`). The sandbox has no session tools, so scenarios assert the file-side behaviour and the one-line degradation:
   - Data first: on the live host, list a session that waits on a question and one that finished, and write the two returned states into the SDS section before authoring `children-status`.
   - `session-status-writes-status-block`, `session-status-blocked-on-operator`
   - `start-child-writes-task-and-ledger-row` — asserts the commit of both files, the brief's contents, the one-line notice that no session can be started here and the printed brief. Recording the returned session reference is proven only by the live-host run.
   - `children-status-board-from-task-files` — `setup()` commits a manager task file and three child task files in different states; one child's `## Status` exists only as a commit on its own branch, so a board built from the working tree alone fails. `children-status-marks-unverified-claims` — a child whose `Not verified:` list is non-empty, a child whose branch is not pushed, and a `Told directly by the operator` line. Each asserts the one-line notice that sessions cannot be listed here.
   - `close-swarm-collects-follow-ups`, `close-swarm-refuses-unmerged-child`, `close-swarm-lists-leftovers` (removes the worktree of a merged child, refuses the child that is `blocked on operator`, ends with the list of unclosed rows, unmerged branches and remaining worktrees)
   - three trigger scenarios per skill (15)
   - Before authoring: run one existing scenario of another skill as the infrastructure smoke test. RED for a new skill: write the scenario, add a `SKILL.md` that holds only the frontmatter description, run the scenario and confirm it fails on its behaviour items, not on the skill being absent.
9. **Documentation.** SRS: `FR-SWARM` with sub-sections `.LEDGER`, `.START`, `.STATUS`, `.REPORT`, `.CLOSE`, each with Description, Rationale (the measurements in this file's Context), Acceptance and Status; `**Tasks:**` back-pointers. SDS: the pack in §3.1.1, the five skills in §3.0, a component section for the state model. Index rows. README §Packs. `framework/AGENTS.md` §Packs. `documents/ides-difference.md`: a row on which hosts expose session control.
10. **Verification.** `deno task check > "$SCRATCH/check.log" 2>&1` with the verdict read from the summary line; each new scenario run singly during RED and GREEN; the full sweep of the four skills handed to the user (`deno task acceptance-tests -f <skill>` for each); the manual live-host run by the user.

## Follow-ups

- Implementation record, 2026-11-10: 21 scenarios (9 execution, 12 trigger) pass on claude `claude-sonnet-5-5`; each execution scenario failed first on a `SKILL.md` that held only the description. `deno task check` — 953 passed, 0 failed. The DoD item "live-host behaviour" stays open: it is the operator's manual run, and with it the capture of what the host's session listing returns for a waiting and for a finished session.
- The board skill was planned as `swarm-status` and ships as `children-status`: the naming check (NP-5, `scripts/check-naming-prefix.ts`) rejects a skill name that repeats its pack's name as a prefix. Renamed on 2026-11-10 during implementation; every mention in this file follows the shipped name.
- Automatic state writing (a turn-end hook that writes `## Status` without relying on the child, a script that builds the board deterministically, a documented format the Royak app can read) is the next task. Until then two pains are only partly covered: a child the operator wrote to directly reports it only if it runs `session-status`, and a silently frozen child is detected only when `children-status` is run. A third: a child that stops on a question without running `session-status` is told apart from a stalled one only where the host reports that it waits for the user.
- Recording a decision sent to children rests on one rule line in the manager's task file and no scenario checks that the manager follows it; a dedicated skill was considered and dropped on 2026-11-10. Revisit if decisions are found missing after a compaction.
- Cost and budget of a swarm — usage per child, a cap on how many children start at once — are not in this task. The transcripts show fan-outs of 10 to 13 children in two minutes before two limit hits, but no measured threshold to build a cap on.
- In-session subagents are out of scope: a subagent has no session of its own to list, message or archive.
- Superseding the operator's personal `/child` skill in both config roots, and enabling the new plugin in both accounts, are the operator's steps after the set ships.
- `FR-SWARM` SRS section pending — its task back-pointer and its index row are deferred to the develop and commit phase: an index row written now points at an anchor that does not exist yet, and the reference check rejects it (`dead REF "fr:swarm"`, checked 2026-11-10).
