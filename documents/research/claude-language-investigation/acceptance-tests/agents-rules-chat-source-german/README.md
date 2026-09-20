# `agents-rules-chat-source-german` — the source-language control, frozen

These three files are the acceptance scenario that measured Control 3 in
[post-closure controls](../../post-closure-controls.md): the same task and the
same checklist as `agents-rules-chat-source`, with the source document
translated into German. It ran once, on 2026-09-20, and was then removed from
the live suite — it is a measurement, not a product requirement.

The files are frozen exactly as they ran. In particular the `russian_prose`
checklist here still counts a parenthetical gloss as a failure, which is how the
criterion read that day. The live criterion stopped counting glosses afterwards;
scoring these files against the live criterion would not reproduce the published
verdicts.

## What each file is

- `mod.ts` — the scenario. Derived from `agents-rules-chat-source/mod.ts`; the
  user's question, the project rule, the checklist and both timeouts are
  byte-identical, and the only checklist edit names German as well as English in
  its example list.
- `fixture/release-note.md` — the German source document. Same five facts under
  the same four headings as the English fixture.
- `calibration.json` — four fixed replies with their expected verdicts. The
  judge matched all four twice on 2026-09-20:
  [calibration record](../../claude-language-fix-evidence/source-language-control-german-calibration.json).

## Re-running it

Copy the directory back to `framework/core/acceptance-tests/`, add
`"source-german"` to the `suffixes` array in
`framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts`,
then:

```sh
deno test -A framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts -- <fresh-output-dir> source-german
set -a; . ./.env; set +a
deno task acceptance-tests -f agents-rules-chat-source-german -i claude -n 3 --no-cache
```

The runner does not read `.env` itself; without the export every session aborts
with an expired-OAuth error before the agent starts.
