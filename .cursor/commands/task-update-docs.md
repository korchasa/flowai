---
description: Synchronize project documentation with latest code changes using concise writing
---

# Update Documentation

## Overview
Synchronize project documentation in `./documents` with the latest code changes using concise, high-information writing.

## Todo List
1. **Preparation**
   - Read all existing docs in `./documents`
   - Study all changes since the last commit (use `| cat` for git operations)

2. **Update docs**
   - Update all docs in `./documents` (except `./documents/whiteboard.md`) to reflect current state
   - English only; remove history/changelogs; keep only current state
   - Apply combined extractive + abstractive summarization: extract ALL facts then compress without losing facts
   - Prioritize essential information; remove fluff and redundancies
   - Use compact formats: lists, tables, YAML, Mermaid diagrams
   - Optimize lexicon: remove stopwords; use shorter synonyms
   - Apply entity compression: after first mention use common abbreviations
   - Avoid filler phrases; use direct language
   - Structure clearly with headings and sections
   - Lemmatize when applicable
   - Prefer special symbols, numerals, ligatures where relevant

## Checklist
- [ ] Changes since last commit analyzed
- [ ] All docs (except whiteboard) updated to current state
- [ ] English-only content ensured
- [ ] Facts preserved; content compressed
- [ ] Compact formats used where possible
- [ ] Language optimized; fillers removed
- [ ] Clear structure with headings
