# pagerkit

Paging helpers for the results list.

## Paging rules

- `pageCount(total, pageSize)` returns how many pages the pager renders.
- `pageSize` must be positive; anything else is a `RangeError`.
- **The pager always renders at least one page.** An empty result set has a page
  count of 1, and that page carries the "nothing found" empty state. Returning 0
  here breaks the pager, which then renders no page at all and leaves the user
  looking at a blank panel with no way back.
- Page numbers shown to the user are 1-based.

## Captions

`resultRange(total, pageSize, page)` renders the caption under the list —
`Showing 1–10 of 42`, or `No results` when there is nothing to show.
