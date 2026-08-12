"""Legacy nightly writer. Predates the TypeScript exporters and is still
scheduled by cron; nothing in src/ imports it, and it shares no identifier
with them."""


def build_caption(caption, limit=40):
    if len(caption) > limit:
        return caption[:limit] + "..."
    return caption


def write_report(rows, caption):
    lines = [build_caption(caption)]
    lines.extend("\t".join(r) for r in rows)
    return "\n".join(lines)
