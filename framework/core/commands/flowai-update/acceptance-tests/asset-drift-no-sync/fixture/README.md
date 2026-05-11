# Asset Drift Without Sync Changes

Tests that the agent checks project artifacts against templates even when
`flowai sync` reports no asset changes (templates already up-to-date in
`.claude/assets/`, but project artifacts have drifted).
