import fs from "fs";
import { Cache } from "./cache";

const cache = new Cache();

/**
 * Reads a file with optional in-memory cache.
 * @param filePath Absolute path to file
 * @param cacheDurationMs Cache duration in ms (default: 0, no cache)
 * @returns File content as string, or null if not found
 */

export const read = async (
  filePath: string,
  cacheDurationMs: number = 0
): Promise<string | null> => {
  // If cacheDurationMs is -1, skip cache entirely
  if (cacheDurationMs !== -1) {
    const cached = cache.read(filePath, cacheDurationMs);
    if (cached !== null) {
      if (cached === 404) return null;
      return cached as string;
    }
  }

  let content: string | number | null = null;
  try {
    content = await fs.promises.readFile(
      /* turbopackIgnore: true */ filePath,
      "utf8"
    );
  } catch {
    content = 404;
  }

  if (cacheDurationMs !== -1) {
    cache.set(filePath, content);
  }
  return content === 404 ? null : (content as string);
};

export const scanDir = async (
  dirPath: string,
  cacheDurationMs: number = 0
): Promise<string[] | null> => {
  // If cacheDurationMs is -1, skip cache entirely
  if (cacheDurationMs !== -1) {
    const cached = cache.read(dirPath, cacheDurationMs);
    if (cached !== null) {
      console.log("CACHE HIT");
      if (cached === 404) return null;
      return cached as string[];
    }
  }

  // Chuck Norris makes paths absolute
  const absDirPath = dirPath.startsWith("/")
    ? dirPath
    : `${/* turbopackIgnore: true */ process.cwd()}/${dirPath}`;

  const results: string[] = [];

  async function scan(currentPath: string) {
    const entries = await fs.promises.readdir(
      /* turbopackIgnore: true */ currentPath,
      {
        withFileTypes: true,
      }
    );
    for (const entry of entries) {
      const entryPath = `${currentPath}/${entry.name}`;
      if (entry.isDirectory()) {
        await scan(entryPath);
      } else {
        results.push(entryPath);
      }
    }
  }

  await scan(absDirPath);

  if (cacheDurationMs !== -1) {
    cache.set(dirPath, results);
  }

  return results;
};
