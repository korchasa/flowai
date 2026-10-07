# Round 3 — browser agent errands

The sample holds 8 errands, E1-E8. E6-E8 (Gmail, Amazon, Maps) ran in rounds 1
and 2. Round 3 ran the five new errands E1-E5 once each against build `b-31d9`
of the headless browser tool. Total cost: $1.34. Call budget per errand: 10 browser calls.

## Errands

| id | site | verdict | score | calls | cost | page-text share of cost |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | Hacker News thread | pass | 100 | 8 | $0.18 | 21% |
| E2 | Wikipedia facts | pass | 94 | 12 | $0.15 | 33% |
| E3 | GitHub issues | pass | 88 | 23 | $0.25 | 41% |
| E4 | Booking.com hotel | fail | 87 | 29 | $0.48 | 53% |
| E5 | YouTube talk | fail* | 84 | 19 | $0.28 | 46% |

`*` E5: the checker expected duration 50:06, the agent reported 50:05. Both
values are shown by YouTube itself (player rounds down, list rounds up).
Checker patched to accept both; the report now passes every automatic check.

E4 failed because the agent inferred breakfast from rate names and never
opened the hotel's own answer.

Only E1 stayed within the call budget. In the others the agent reads a page,
looks around, and reads it again instead of returning the needed facts in one
scenario.

## Anomalies (not investigated)

- N1: `getText()` on GitHub skips rows that are not rendered yet.
- N2: YouTube in a hidden window draws almost nothing until the first input.
- N3: Booking sort menu did not open in 4 of 5 clicks.
- N4: "Page information" link on Wikipedia did not react to a click.
- N5: `scrollIntoView` on a long GitHub issue timed out once after 30 s.
- N6: a Playwright-style selector (`button:has-text(...)`) is reported as an
  internal tool error, although the selector is the agent's mistake.

## Budget

Another round of all 8 errands costs about $3.
