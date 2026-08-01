import { createHash } from "node:crypto";
import path from "node:path";

import { z } from "zod";

export const QUICKSHARE_RELEASE_MANIFEST_VERSION = "quickshare.release/v1";

const safePathPattern = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const contentHashPattern = /(?:^|\/)[^/]*[.-][a-f0-9]{8,}\.[A-Za-z0-9]+$/;
const contentTypePattern = /^[a-z][a-z0-9!#$&^_.+-]*\/[a-z0-9!#$&^_.+-]+(?:;\s*charset=utf-8)?$/i;

export const quickShareReleaseManifestSchema = z.object({
  version: z.literal(QUICKSHARE_RELEASE_MANIFEST_VERSION),
  entry: z.enum(["index.html", "index.txt"]),
  files: z.array(z.object({
    path: z.string().regex(safePathPattern, "File paths must be relative and traversal-free."),
    contentType: z.string().regex(contentTypePattern, "A valid MIME type is required."),
    sha256: z.string().regex(/^[a-f0-9]{64}$/, "SHA-256 must be lowercase hexadecimal."),
    byteSize: z.number().int().nonnegative(),
  })).min(1),
}).strict();

export type QuickShareReleaseManifest = z.infer<typeof quickShareReleaseManifestSchema>;
export type QuickShareReleaseBundle = {
  manifest: QuickShareReleaseManifest;
  files: Record<string, Buffer | string>;
};

export class QuickShareBundleError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "QuickShareBundleError";
  }
}

const digest = (content: Buffer) => createHash("sha256").update(content).digest("hex");
const normalizeFile = (content: Buffer | string) => Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");

const localReferences = (source: string, sourcePath: string, contentType: string) => {
  const references = new Set<string>();
  const expression = contentType.startsWith("text/css")
    ? /url\(\s*["']?([^"')]+)["']?\s*\)/gi
    : /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  for (const match of source.matchAll(expression)) {
    const value = match[1];
    if (!value || value.startsWith("#") || value.startsWith("data:") || /^[a-z][a-z0-9+.-]*:/i.test(value)) continue;
    if (value.startsWith("//")) throw new QuickShareBundleError("protocol_relative_reference", `${sourcePath} uses a protocol-relative reference.`);
    const pathname = value.split(/[?#]/, 1)[0];
    if (pathname.startsWith("/_quickshare/")) continue;
    if (pathname.startsWith("/")) throw new QuickShareBundleError("undeclared_absolute_reference", `${sourcePath} uses an undeclared absolute reference.`);
    references.add(path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), pathname.replace(/^\//, ""))));
  }
  return references;
};

export const validateQuickShareReleaseBundle = (bundle: QuickShareReleaseBundle) => {
  const parsed = quickShareReleaseManifestSchema.safeParse(bundle.manifest);
  if (!parsed.success) throw new QuickShareBundleError("invalid_manifest", parsed.error.issues[0]?.message ?? "Invalid release manifest.");
  const manifest = parsed.data;
  const manifestPaths = new Set<string>();
  const sourcePaths = Object.keys(bundle.files);

  for (const file of manifest.files) {
    if (manifestPaths.has(file.path)) throw new QuickShareBundleError("duplicate_manifest_path", `Duplicate manifest file: ${file.path}`);
    manifestPaths.add(file.path);
    if (path.posix.normalize(file.path) !== file.path) throw new QuickShareBundleError("non_normalized_path", `File path is not normalized: ${file.path}`);
    if (file.path !== manifest.entry && !contentHashPattern.test(file.path)) {
      throw new QuickShareBundleError("unhashed_sidecar", `Sidecar file must be content-hashed: ${file.path}`);
    }
  }
  if (!manifestPaths.has(manifest.entry)) throw new QuickShareBundleError("missing_entry", `Bundle manifest must include ${manifest.entry}.`);
  if (sourcePaths.length !== manifestPaths.size || sourcePaths.some((filePath) => !manifestPaths.has(filePath))) {
    throw new QuickShareBundleError("manifest_file_mismatch", "Manifest files must exactly match supplied bundle files.");
  }

  for (const file of manifest.files) {
    const content = bundle.files[file.path];
    if (content === undefined) throw new QuickShareBundleError("missing_file", `Missing bundle file: ${file.path}`);
    const bytes = normalizeFile(content);
    if (bytes.byteLength !== file.byteSize) throw new QuickShareBundleError("byte_size_mismatch", `Byte size does not match: ${file.path}`);
    if (digest(bytes) !== file.sha256) throw new QuickShareBundleError("hash_mismatch", `SHA-256 does not match: ${file.path}`);
  }

  const references = new Set<string>();
  for (const file of manifest.files.filter((item) => item.contentType.startsWith("text/html") || item.contentType.startsWith("text/css"))) {
    const source = normalizeFile(bundle.files[file.path]).toString("utf8");
    for (const reference of localReferences(source, file.path, file.contentType)) {
      if (!manifestPaths.has(reference)) throw new QuickShareBundleError("missing_reference", `${file.path} references a file not in the manifest: ${reference}`);
      if (reference === manifest.entry) throw new QuickShareBundleError("recursive_entry_reference", "Published files cannot reference their entry as an asset.");
      references.add(reference);
    }
  }
  return { manifest, localReferences: [...references] };
};

export const rewriteQuickShareEntryReferences = (
  source: string,
  input: { appId: string; resourceId: string; releaseId: string; knownPaths: ReadonlySet<string> },
) => source.replace(/\b(src|href)\s*=\s*(["'])([^"']+)\2/gi, (whole, attribute, quote, rawValue) => {
  if (rawValue.startsWith("#") || rawValue.startsWith("data:") || rawValue.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(rawValue)) return whole;
  const split = rawValue.match(/^([^?#]*)(.*)$/);
  const pathname = split?.[1] ?? rawValue;
  const suffix = split?.[2] ?? "";
  if (!pathname || pathname.startsWith("/_quickshare/")) return whole;
  const localPath = pathname.replace(/^\//, "");
  if (!input.knownPaths.has(localPath) || localPath === "index.html") return whole;
  return `${attribute}=${quote}/_quickshare/releases/${input.appId}/${input.resourceId}/${input.releaseId}/${localPath}${suffix}${quote}`;
});

export const createQuickShareFixtureBundle = (html = "<link rel=\"stylesheet\" href=\"assets/site.a1b2c3d4.css\"><h1>Fixture</h1>") => {
  const files: Record<string, Buffer> = {
    "index.html": Buffer.from(html),
    "assets/site.a1b2c3d4.css": Buffer.from("body { color: #111; }\n"),
  };
  const manifest: QuickShareReleaseManifest = {
    version: QUICKSHARE_RELEASE_MANIFEST_VERSION,
    entry: "index.html",
    files: Object.entries(files).map(([filePath, content]) => ({
      path: filePath,
      contentType: filePath.endsWith(".html") ? "text/html; charset=utf-8" : "text/css; charset=utf-8",
      sha256: digest(content),
      byteSize: content.byteLength,
    })),
  };
  return { manifest, files } satisfies QuickShareReleaseBundle;
};
