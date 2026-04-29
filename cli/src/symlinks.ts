// [FR-DIST.SYMLINKS](../../documents/requirements.md#fr-dist.symlinks-claude.md-symlinks) — CLAUDE.md -> AGENTS.md symlinks
import { type FsAdapter, join } from "./adapters/fs.ts";

/**
 * When claude IDE is configured, create CLAUDE.md -> AGENTS.md symlinks
 * wherever AGENTS.md exists in the project (root and subdirs).
 */
export async function syncClaudeSymlinks(
  cwd: string,
  fs: FsAdapter,
): Promise<{ created: string[]; skipped: string[]; updated: string[] }> {
  const created: string[] = [];
  const skipped: string[] = [];
  const updated: string[] = [];

  await walkAndSymlink(cwd, fs, created, skipped, updated);

  return { created, skipped, updated };
}

async function walkAndSymlink(
  dir: string,
  fs: FsAdapter,
  created: string[],
  skipped: string[],
  updated: string[],
): Promise<void> {
  const agentsPath = join(dir, "AGENTS.md");
  const claudePath = join(dir, "CLAUDE.md");

  if (await fs.exists(agentsPath)) {
    if (await fs.exists(claudePath)) {
      const stat = await fs.stat(claudePath);
      if (stat.isSymlink) {
        // Check if symlink points to correct target
        const target = await fs.readLink(claudePath);
        if (target !== "AGENTS.md") {
          await fs.remove(claudePath);
          await fs.symlink("AGENTS.md", claudePath);
          updated.push(claudePath);
        }
        // Already correct symlink — skip silently
      } else {
        // CLAUDE.md exists as regular file — skip (conflict)
        skipped.push(claudePath);
      }
    } else {
      await fs.symlink("AGENTS.md", claudePath);
      created.push(claudePath);
    }
  }

  // Recurse into subdirectories
  try {
    for await (const entry of fs.readDir(dir)) {
      if (entry.isDirectory && !entry.name.startsWith(".")) {
        await walkAndSymlink(
          join(dir, entry.name),
          fs,
          created,
          skipped,
          updated,
        );
      }
    }
  } catch {
    // Directory might not exist or be unreadable
  }
}
