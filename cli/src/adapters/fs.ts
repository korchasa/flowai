import { join } from "@std/path/join";

/** Abstract FS operations for testability */
export interface FsAdapter {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  readDir(path: string): AsyncIterable<Deno.DirEntry>;
  stat(path: string): Promise<Deno.FileInfo>;
  symlink(target: string, path: string): Promise<void>;
  readLink(path: string): Promise<string>;
  remove(path: string): Promise<void>;
}

/** Real filesystem adapter using Deno APIs */
export class DenoFsAdapter implements FsAdapter {
  async readFile(path: string): Promise<string> {
    return await Deno.readTextFile(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    const dir = path.substring(0, path.lastIndexOf("/"));
    if (dir) {
      await Deno.mkdir(dir, { recursive: true });
    }
    await Deno.writeTextFile(path, content);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await Deno.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async mkdir(path: string): Promise<void> {
    await Deno.mkdir(path, { recursive: true });
  }

  readDir(path: string): AsyncIterable<Deno.DirEntry> {
    return Deno.readDir(path);
  }

  async stat(path: string): Promise<Deno.FileInfo> {
    return await Deno.lstat(path);
  }

  async symlink(target: string, path: string): Promise<void> {
    await Deno.symlink(target, path);
  }

  async readLink(path: string): Promise<string> {
    return await Deno.readLink(path);
  }

  async remove(path: string): Promise<void> {
    await Deno.remove(path);
  }
}

/** In-memory FS adapter for testing */
export class InMemoryFsAdapter implements FsAdapter {
  files: Map<string, string> = new Map();
  dirs: Set<string> = new Set();
  symlinks: Map<string, string> = new Map();

  readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      return Promise.reject(
        new Deno.errors.NotFound(`File not found: ${path}`),
      );
    }
    return Promise.resolve(content);
  }

  writeFile(path: string, content: string): Promise<void> {
    const dir = path.substring(0, path.lastIndexOf("/"));
    if (dir) {
      this.dirs.add(dir);
    }
    this.files.set(path, content);
    return Promise.resolve();
  }

  exists(path: string): Promise<boolean> {
    return Promise.resolve(
      this.files.has(path) || this.dirs.has(path) ||
        this.symlinks.has(path),
    );
  }

  mkdir(path: string): Promise<void> {
    this.dirs.add(path);
    return Promise.resolve();
  }

  async *readDir(path: string): AsyncIterable<Deno.DirEntry> {
    const prefix = path.endsWith("/") ? path : path + "/";
    const seen = new Set<string>();

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const rest = filePath.substring(prefix.length);
        const name = rest.split("/")[0];
        if (!seen.has(name)) {
          seen.add(name);
          const isDir = rest.includes("/");
          yield {
            name,
            isFile: !isDir,
            isDirectory: isDir,
            isSymlink: false,
          };
        }
      }
    }

    for (const dirPath of this.dirs) {
      if (dirPath.startsWith(prefix) && dirPath !== path) {
        const rest = dirPath.substring(prefix.length);
        const name = rest.split("/")[0];
        if (!seen.has(name)) {
          seen.add(name);
          yield { name, isFile: false, isDirectory: true, isSymlink: false };
        }
      }
    }
  }

  stat(path: string): Promise<Deno.FileInfo> {
    const isSymlink = this.symlinks.has(path);
    const isFile = this.files.has(path);
    const isDir = this.dirs.has(path);

    if (!isFile && !isDir && !isSymlink) {
      return Promise.reject(
        new Deno.errors.NotFound(`Not found: ${path}`),
      );
    }

    return Promise.resolve({
      isFile: isFile && !isSymlink,
      isDirectory: isDir,
      isSymlink,
      size: isFile ? (this.files.get(path)?.length ?? 0) : 0,
      mtime: null,
      atime: null,
      birthtime: null,
      dev: 0,
      ino: null,
      mode: null,
      nlink: null,
      uid: null,
      gid: null,
      rdev: null,
      blksize: null,
      blocks: null,
      isBlockDevice: null,
      isCharDevice: null,
      isFifo: null,
      isSocket: null,
      ctime: null,
    });
  }

  symlink(target: string, path: string): Promise<void> {
    this.symlinks.set(path, target);
    return Promise.resolve();
  }

  readLink(path: string): Promise<string> {
    const target = this.symlinks.get(path);
    if (target === undefined) {
      return Promise.reject(
        new Deno.errors.NotFound(`Not a symlink: ${path}`),
      );
    }
    return Promise.resolve(target);
  }

  remove(path: string): Promise<void> {
    this.files.delete(path);
    this.dirs.delete(path);
    this.symlinks.delete(path);
    return Promise.resolve();
  }
}

/** Join paths utility (re-export for convenience) */
export { join };
