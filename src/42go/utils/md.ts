import path from "path";
import matter from "gray-matter";
import { read as readFile, scanDir as scanFileDir } from "./fs";
import { Cache } from "./cache";

export interface MDFile {
  path: string;
  content: string;
  data: Record<string, string>;
  isEmpty: boolean;
  excerpt?: string;
}

const cache = new Cache();

const FALLBACKS = ["README.mdx", "README.md", "index.mdx", "index.md"];

export const read = async (
  inputPath: string,
  expiry: number = 0
): Promise<MDFile | null> => {
  // Check cache (expiry = -1 skips check)
  if (expiry !== -1) {
    const cached = cache.read(inputPath, expiry);
    if (cached !== null) {
      if (cached === 404) return null;
      return cached as MDFile;
    }
  }

  let rawPath: string = inputPath;
  let rawContent: string | number | null = null;
  const absPath = path.isAbsolute(inputPath)
    ? inputPath
    : path.join(/* turbopackIgnore: true */ process.cwd(), inputPath);

  // Try to read the file directly
  if (/\.(mdx?|MDX?)$/.test(absPath)) {
    rawPath = absPath;
    rawContent = await readFile(absPath, -1);
  }

  // Try fallbacks in folder
  else {
    const fallbacks = [
      `${absPath}.md`,
      ...FALLBACKS.map((fallback) =>
        path.join(/* turbopackIgnore: true */ absPath, fallback)
      ),
    ];

    try {
      for (const fallback of fallbacks) {
        rawPath = fallback;
        rawContent = await readFile(fallback, -1);
        if (rawContent !== null) break;
      }
    } catch {
      rawContent = 404;
    }
  }

  // Cache the missed hit
  if (rawContent === null || rawContent === 404) {
    if (expiry !== -1) cache.set(inputPath, 404);
    return null;
  }

  // Parse & cache the content
  const parsed = matter(rawContent as string);
  const returnValue = {
    path: rawPath,
    content: parsed.content,
    data: parsed.data,
    isEmpty: parsed.content.trim().length === 0,
    excerpt: parsed.excerpt,
  };
  if (expiry !== -1) cache.set(inputPath, returnValue);
  return returnValue;
};

export const scanDir = async (
  dirPath: string,
  cacheDurationMs: number = 0
): Promise<MDFile[] | null> => {
  // If cacheDurationMs is -1, skip cache entirely
  if (cacheDurationMs !== -1) {
    const cached = cache.read(dirPath, cacheDurationMs);
    if (cached !== null) {
      console.log("CACHE HIT");
      if (cached === 404) return null;
      return cached as MDFile[];
    }
  }

  // Read files and handle folder not found
  const allPaths = await scanFileDir(dirPath, -1);
  if (allPaths === null) {
    if (cacheDurationMs !== -1) {
      cache.set(dirPath, 404);
    }
    return null;
  }

  // Filter only markdown files & read the content
  const mdPaths = allPaths.filter((file) => file.toLowerCase().endsWith(".md"));
  const mdFiles = await Promise.all(mdPaths.map((file) => read(file, -1)));

  // Cache and return
  if (cacheDurationMs !== -1) {
    cache.set(dirPath, mdFiles);
  }
  return mdFiles as MDFile[];
};
