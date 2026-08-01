import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readlink, readdir, rename, rm, rmdir, symlink, unlink } from "node:fs/promises";
import path from "node:path";

import {
  rewriteQuickShareEntryReferences,
  validateQuickShareReleaseBundle,
  type QuickShareReleaseBundle,
} from "./release-bundle.ts";
import { getQuickSharePublicationRoot } from "./publication-config.ts";
import type { QuickSharePublicIdentifier } from "./publisher-contract.ts";

const segmentPattern = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const handlePattern = /^[a-z0-9][a-z0-9-]{1,39}$/;

export class QuickSharePublicationError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "QuickSharePublicationError";
  }
}

type PublicationIdentity = { appId: string; accountId: string; resourceId: string; releaseId: string };
const locks = new Map<string, Promise<void>>();

const assertSegment = (value: string, name: string, expression = segmentPattern) => {
  if (!expression.test(value)) throw new QuickSharePublicationError("invalid_path_segment", `Invalid ${name}.`);
  return value;
};

const exists = async (target: string) => lstat(target).then(() => true).catch((error) => {
  if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT") return false;
  throw error;
});

const ensureRootPath = (root: string, target: string) => {
  const relative = path.relative(root, target);
  if (relative === "" || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new QuickSharePublicationError("unsafe_publication_path", "Publication path escapes its configured root.");
  }
  return target;
};

const publicationPaths = (input: PublicationIdentity) => {
  assertSegment(input.appId, "app identifier");
  assertSegment(input.accountId, "account identifier");
  assertSegment(input.resourceId, "resource identifier");
  assertSegment(input.releaseId, "release identifier");
  const root = path.resolve(getQuickSharePublicationRoot(input.appId));
  const releases = ensureRootPath(root, path.join(root, "_quickshare", "releases", input.appId, input.resourceId, input.releaseId));
  const entry = ensureRootPath(root, path.join(root, ".quickshare", "entries", input.appId, input.resourceId, input.releaseId));
  return { root, releases, entry };
};

const routePath = (root: string, identifier: QuickSharePublicIdentifier) => {
  if (identifier.kind === "short") {
    return ensureRootPath(root, path.join(root, assertSegment(identifier.shortCode, "short code")));
  }
  return ensureRootPath(root, path.join(root, assertSegment(identifier.handle, "handle", handlePattern), assertSegment(identifier.customId, "custom identifier", handlePattern)));
};

const withLock = async <T>(key: string, operation: () => Promise<T>): Promise<T> => {
  const previous = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  locks.set(key, queued);
  await previous;
  try { return await operation(); }
  finally {
    release();
    if (locks.get(key) === queued) locks.delete(key);
  }
};

const writeNoFollow = async (target: string, content: Buffer) => {
  await mkdir(path.dirname(target), { recursive: true });
  const handle = await open(target, "wx", 0o644);
  try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
};

const syncDirectory = async (target: string) => {
  const handle = await open(target, "r");
  try { await handle.sync(); } finally { await handle.close(); }
};

const readSymlinkTarget = async (root: string, target: string) => {
  try {
    const stat = await lstat(target);
    if (!stat.isSymbolicLink()) throw new QuickSharePublicationError("unexpected_stable_entry", `Stable entry is not managed by QuickShare: ${target}`);
    const linked = await readlink(target);
    const resolved = path.resolve(path.dirname(target), linked);
    const entriesRoot = path.join(root, ".quickshare", "entries");
    const relative = path.relative(entriesRoot, resolved);
    if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new QuickSharePublicationError("unsafe_stable_target", "Stable entry points outside the QuickShare entry namespace.");
    }
    return resolved;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT") return null;
    throw error;
  }
};

const replaceStableLink = async (target: string, entry: string) => {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.pending-${randomUUID()}`;
  const relativeEntry = path.relative(path.dirname(target), entry);
  await symlink(relativeEntry, temporary, "dir");
  try { await rename(temporary, target); }
  catch (error) { await rm(temporary, { force: true }); throw error; }
};

const removeEmptyParent = async (target: string, root: string) => {
  const parent = path.dirname(target);
  if (parent !== root) await rmdir(parent).catch((error) => {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOTEMPTY") return;
    throw error;
  });
};

const writeRelease = async (input: PublicationIdentity & { bundle: QuickShareReleaseBundle }) => {
  const checked = validateQuickShareReleaseBundle(input.bundle);
  const paths = publicationPaths(input);
  if (await exists(paths.releases) || await exists(paths.entry)) {
    throw new QuickSharePublicationError("release_exists", "Release identifier is already projected.");
  }
  const staging = ensureRootPath(paths.root, path.join(paths.root, ".quickshare", "staging", randomUUID()));
  try {
    for (const file of checked.manifest.files) {
      const destination = ensureRootPath(staging, path.join(staging, file.path));
      await writeNoFollow(destination, Buffer.isBuffer(input.bundle.files[file.path]) ? input.bundle.files[file.path] as Buffer : Buffer.from(input.bundle.files[file.path] as string));
    }
    await syncDirectory(staging);
    await mkdir(path.dirname(paths.releases), { recursive: true });
    await rename(staging, paths.releases);
    await syncDirectory(path.dirname(paths.releases));

    const entryPath = checked.manifest.entry;
    const sourceEntry = input.bundle.files[entryPath];
    const entryBytes = Buffer.isBuffer(sourceEntry) ? sourceEntry : Buffer.from(sourceEntry, 'utf8');
    const entryDefinition = checked.manifest.files.find(file => file.path === entryPath)!;
    const projectedEntry = entryDefinition.contentType.startsWith('text/html')
      ? Buffer.from(
          rewriteQuickShareEntryReferences(entryBytes.toString('utf8'), {
            appId: input.appId,
            resourceId: input.resourceId,
            releaseId: input.releaseId,
            knownPaths: new Set(checked.manifest.files.map(file => file.path)),
          })
        )
      : entryBytes;
    await writeNoFollow(path.join(paths.entry, entryPath), projectedEntry);
    await syncDirectory(paths.entry);
    return { ...paths, manifest: checked.manifest };
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    await rm(paths.releases, { recursive: true, force: true });
    await rm(paths.entry, { recursive: true, force: true });
    throw error;
  }
};

export type QuickShareFilesystemActivation = PublicationIdentity & {
  bundle: QuickShareReleaseBundle;
  nextIdentifier: QuickSharePublicIdentifier;
  previousIdentifier: QuickSharePublicIdentifier | null;
};

export const activateQuickShareFilesystemRelease = async (input: QuickShareFilesystemActivation) => withLock(
  `${input.appId}:${input.resourceId}`,
  async () => {
    const { root } = publicationPaths(input);
    const nextRoute = routePath(root, input.nextIdentifier);
    const previousRoute = input.previousIdentifier ? routePath(root, input.previousIdentifier) : null;
    const previousTarget = previousRoute ? await readSymlinkTarget(root, previousRoute) : null;
    const nextTarget = await readSymlinkTarget(root, nextRoute);
    if (nextTarget && nextRoute !== previousRoute) throw new QuickSharePublicationError("route_exists", "The candidate public route is already active.");

    const projected = await writeRelease(input);
    try {
      // Candidate is made reachable first. The old route survives until this
      // replacement succeeds, so an identifier switch never produces a gap.
      await replaceStableLink(nextRoute, projected.entry);
      if (previousRoute && previousRoute !== nextRoute) {
        await unlink(previousRoute);
        await removeEmptyParent(previousRoute, root);
      }
      return {
        releaseDirectory: projected.releases,
        stableRoute: nextRoute,
        manifest: projected.manifest,
        rollback: async () => {
          if (previousRoute && previousTarget) await replaceStableLink(previousRoute, previousTarget);
          if (nextRoute !== previousRoute) await rm(nextRoute, { recursive: false, force: true });
          await rm(projected.releases, { recursive: true, force: true });
          await rm(projected.entry, { recursive: true, force: true });
        },
      };
    } catch (error) {
      if (previousRoute && previousTarget) await replaceStableLink(previousRoute, previousTarget).catch(() => undefined);
      if (nextRoute !== previousRoute) await rm(nextRoute, { recursive: false, force: true }).catch(() => undefined);
      await rm(projected.releases, { recursive: true, force: true });
      await rm(projected.entry, { recursive: true, force: true });
      throw error;
    }
  },
);

export const purgeQuickShareFilesystemResource = async (input: Pick<PublicationIdentity, "appId" | "resourceId">) => withLock(
  `${input.appId}:${input.resourceId}`,
  async () => {
    const root = path.resolve(getQuickSharePublicationRoot(input.appId));
    assertSegment(input.appId, "app identifier");
    assertSegment(input.resourceId, "resource identifier");
    const journal = ensureRootPath(root, path.join(root, ".quickshare", "purge-journal", randomUUID()));
    const moved: Array<{ from: string; to: string }> = [];
    const moveToJournal = async (from: string, kind: string) => {
      if (!(await exists(from))) return;
      const destination = ensureRootPath(root, path.join(journal, kind, path.relative(root, from)));
      await mkdir(path.dirname(destination), { recursive: true });
      await rename(from, destination);
      moved.push({ from, to: destination });
    };
    if (await exists(root)) {
      for (const rootEntry of await readdir(root, { withFileTypes: true })) {
        if (rootEntry.name.startsWith("_") || rootEntry.name.startsWith(".")) continue;
        const candidate = path.join(root, rootEntry.name);
        const candidates = rootEntry.isDirectory() ? (await readdir(candidate).then((names) => names.map((name) => path.join(candidate, name)))) : [candidate];
        for (const route of candidates) {
          const target = await readSymlinkTarget(root, route);
          if (target && target.includes(`${path.sep}${input.resourceId}${path.sep}`)) {
            await moveToJournal(route, "routes");
            await removeEmptyParent(route, root);
          }
        }
      }
    }
    await moveToJournal(ensureRootPath(root, path.join(root, "_quickshare", "releases", input.appId, input.resourceId)), "releases");
    await moveToJournal(ensureRootPath(root, path.join(root, ".quickshare", "entries", input.appId, input.resourceId)), "entries");
    return {
      finalize: async () => rm(journal, { recursive: true, force: true }),
      rollback: async () => {
        for (const item of moved.reverse()) {
          await mkdir(path.dirname(item.from), { recursive: true });
          await rename(item.to, item.from);
        }
        await rm(journal, { recursive: true, force: true });
      },
    };
  },
);

export const renameQuickShareFilesystemHandle = async (input: { appId: string; fromHandle: string; toHandle: string }) => withLock(
  `${input.appId}:handle:${input.fromHandle}`,
  async () => {
    const root = path.resolve(getQuickSharePublicationRoot(input.appId));
    const from = ensureRootPath(root, path.join(root, assertSegment(input.fromHandle, "handle", handlePattern)));
    const to = ensureRootPath(root, path.join(root, assertSegment(input.toHandle, "handle", handlePattern)));
    if (from === to || !(await exists(from))) return { finalize: async () => undefined, rollback: async () => undefined };
    if (await exists(to)) throw new QuickSharePublicationError("handle_route_exists", "The destination handle folder already exists.");
    await rename(from, to);
    return {
      finalize: async () => undefined,
      rollback: async () => {
        if (await exists(to) && !(await exists(from))) await rename(to, from);
      },
    };
  },
);
