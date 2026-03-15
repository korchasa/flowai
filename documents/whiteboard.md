# Claude Code Auth in Devcontainers — Эксперименты на хосте

## Goal

Проверить реальное поведение auth при lifecycle-событиях devcontainer (rebuild, restart, удаление volume). Внутри контейнера нельзя запустить эти тесты — нужен хост.

## Overview

### Что уже установлено (тесты внутри контейнера)

- Auth токены хранятся в `~/.claude/.credentials.json` (НЕ в `~/.claude.json`)
- На Linux: plaintext файл. На macOS: Keychain с fallback на plaintext
- `~/.claude/.credentials.json` лежит на named volume (`claude-config-${devcontainerId}`) → device 40
- `~/.claude.json` лежит на ephemeral fs → device 89, пересоздаётся автоматически
- `claude auth status` работает БЕЗ `~/.claude.json` (только warning)
- `claude auth status` НЕ работает без `.credentials.json`
- Host `~/.claude/` (macOS) НЕ содержит `.credentials.json` (токены в Keychain)
- `CLAUDE_CONFIG_DIR` перенаправляет поиск `.credentials.json`
- Token refresh работает автоматически через refresh_token
- Симуляция rebuild (HOME=/tmp/fresh + volume) → auth работает

### Чего не хватает

Реальные тесты lifecycle devcontainer, которые можно запустить только с хоста.

## Эксперименты для хоста

### Подготовка

```bash
# Запомнить текущий devcontainerId (нужен для volume name)
# Имя volume: claude-config-${devcontainerId}
docker volume ls | grep claude-config
```

### Эксперимент 1: Container Restart

**Гипотеза:** Auth сохраняется. Volume не пересоздаётся, ephemeral fs сохраняется.

```bash
# 1. До рестарта — проверить auth
devcontainer exec --workspace-folder . claude auth status

# 2. Рестарт
docker restart <container_id>
# или через VS Code: Ctrl+Shift+P → "Dev Containers: Restart Container"

# 3. Подождать запуска, проверить auth
devcontainer exec --workspace-folder . claude auth status

# 4. Проверить файлы
devcontainer exec --workspace-folder . ls -la ~/.claude.json ~/.claude/.credentials.json
```

**Ожидание:** `loggedIn: true`. Оба файла на месте.

### Эксперимент 2: Container Rebuild (тот же devcontainerId)

**Гипотеза:** Auth сохраняется. Volume выживает rebuild, `~/.claude.json` теряется но пересоздаётся.

```bash
# 1. До rebuild — зафиксировать auth и volume
devcontainer exec --workspace-folder . claude auth status
docker volume ls | grep claude-config

# 2. Rebuild
# VS Code: Ctrl+Shift+P → "Dev Containers: Rebuild Container"
# или CLI: devcontainer up --workspace-folder . --rebuild

# 3. После rebuild — проверить auth
devcontainer exec --workspace-folder . claude auth status

# 4. Проверить файлы
devcontainer exec --workspace-folder . stat --format='device=%d name=%n' ~/.claude/.credentials.json
devcontainer exec --workspace-folder . stat --format='device=%d name=%n' ~/.claude.json 2>&1 || echo "claude.json отсутствует (ожидаемо)"

# 5. Проверить что volume тот же
docker volume ls | grep claude-config
```

**Ожидание:** `loggedIn: true`. `.credentials.json` выжил на volume. `~/.claude.json` либо отсутствует, либо пересоздан CLI/extension.

### Эксперимент 3: Удаление volume + rebuild

**Гипотеза:** Auth потерян. Нужна повторная аутентификация через VS Code extension.

```bash
# 1. Найти volume
docker volume ls | grep claude-config
# Пример: claude-config-abc123

# 2. Остановить контейнер
docker stop <container_id>

# 3. Удалить volume
docker volume rm claude-config-<devcontainerId>

# 4. Rebuild
# VS Code: Ctrl+Shift+P → "Dev Containers: Rebuild Container"

# 5. Проверить auth
devcontainer exec --workspace-folder . claude auth status

# 6. Проверить файлы
devcontainer exec --workspace-folder . ls -la ~/.claude/.credentials.json 2>&1
```

**Ожидание:** `loggedIn: false`. `.credentials.json` отсутствует. Нужен повторный OAuth flow через extension UI.

### Эксперимент 4: Rebuild Without Cache (новый devcontainerId)

**Гипотеза:** Новый volume → auth потерян.

```bash
# 1. VS Code: Ctrl+Shift+P → "Dev Containers: Rebuild Without Cache"
# Это создаёт новый devcontainerId → новый volume

# 2. Проверить
devcontainer exec --workspace-folder . claude auth status
docker volume ls | grep claude-config  # должен быть новый volume
```

**Ожидание:** `loggedIn: false`. Новый пустой volume.

### Эксперимент 5: Проверка host-side auth (macOS)

**Гипотеза:** На macOS токены в Keychain, не в файлах.

```bash
# На хосте (macOS):
# 1. Проверить наличие credentials файла
ls -la ~/.claude/.credentials.json 2>&1

# 2. Проверить Keychain
security find-generic-password -s "claude.ai-credentials" -w 2>&1 | head -c 100
# (или другое имя сервиса — проверить через `security dump-keychain | grep claude`)

# 3. Auth status на хосте
claude auth status
```

**Ожидание:** Нет `.credentials.json` на хосте. Токены в Keychain.

### Эксперимент 6: Можно ли перенести auth с хоста в контейнер?

**Гипотеза:** Можно достать токены из Keychain и скопировать в контейнер.

```bash
# На хосте (macOS):
# 1. Извлечь credentials из Keychain
security find-generic-password -s "claude.ai-credentials" -a "$(whoami)" -w 2>/dev/null > /tmp/claude-creds.json

# 2. Проверить формат
cat /tmp/claude-creds.json | jq 'keys'

# 3. Скопировать в контейнер (если volume пустой)
docker cp /tmp/claude-creds.json <container_id>:/home/vscode/.claude/.credentials.json
docker exec <container_id> chown vscode:vscode /home/vscode/.claude/.credentials.json
docker exec <container_id> chmod 600 /home/vscode/.claude/.credentials.json

# 4. Проверить auth
docker exec -u vscode <container_id> claude auth status

# 5. Очистить
rm /tmp/claude-creds.json
```

**Ожидание:** Auth работает. Это позволит автоматизировать проброс auth в devcontainer.

## Definition of Done

- [x] Эксперимент 1: restart — auth сохраняется
- [x] Эксперимент 2: rebuild — auth сохраняется (volume жив)
- [x] Эксперимент 3: удаление volume — auth потерян, нужен re-login
- [x] Эксперимент 4: rebuild without cache — auth потерян (новый volume)
- [x] Эксперимент 5: host auth location подтверждён (Keychain на macOS)
- [x] Эксперимент 6: копирование auth из Keychain в контейнер работает

## Результаты

### Эксперимент 5: Host-side auth (macOS)

- `~/.claude/.credentials.json` на хосте **отсутствует** (подтверждено)
- Keychain сервис: **`Claude Code-credentials`** (НЕ `claude.ai-credentials` как в гипотезе)
- Дополнительные Keychain записи: `Claude Safe Storage`, `AIR Claude Credentials`
- Содержимое: `claudeAiOauth` (accessToken, refreshToken, expiresAt, scopes, subscriptionType, rateLimitTier) + `organizationUuid`
- `claude auth status` на хосте: `loggedIn: true`, method: `claude.ai`, subscription: `max`

### Эксперимент 6: Проброс auth из Keychain в контейнер

- `security find-generic-password -s "Claude Code-credentials" -w` → JSON с токенами
- Формат **идентичен** формату `.credentials.json` в контейнере
- После записи в `/home/vscode/.claude/.credentials.json` + `chmod 600` → `loggedIn: true`
- **Работает без OAuth flow через extension UI**

### Эксперимент 1: Container Restart

- Auth сохраняется после `docker restart`
- `.credentials.json` на месте (device=40, volume)
- **Гипотеза подтверждена**

### Эксперимент 2: Container Rebuild (тот же devcontainerId)

- `devcontainer up --workspace-folder . --remove-existing-container` → новый контейнер, тот же volume
- Auth сохраняется: `loggedIn: true`
- Volume `claude-config-{devcontainerId}` выжил rebuild
- **Гипотеза подтверждена**

### Эксперимент 3: Удаление volume + rebuild

- `docker volume rm claude-config-{id}` + rebuild → `loggedIn: false`
- `.credentials.json` отсутствует
- **Гипотеза подтверждена**

### Эксперимент 4: Rebuild Without Cache (новый devcontainerId)

- Новая папка → новый devcontainerId → новый volume `claude-config-{newId}`
- `loggedIn: false`
- **Гипотеза подтверждена**

### Ключевые находки

- Keychain сервис: `Claude Code-credentials` (не `claude.ai-credentials`)
- Автоматизация проброса auth возможна: `security find-generic-password -s "Claude Code-credentials" -w > ~/.claude/.credentials.json`
- Можно добавить в `postCreateCommand` devcontainer для автоматического проброса
- Volume привязан к devcontainerId (hash от workspace path) → меняется при смене папки
