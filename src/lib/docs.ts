import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const docsDirectory = path.join(process.cwd(), 'docs');

// Keeping a sync version for build-time usage
export function doesDocExistSync(slug: string): boolean {
  const normalizedSlug = slug.replace(/\//g, path.sep);
  const mdPath = path.join(docsDirectory, `${normalizedSlug}.md`);
  const mdxPath = path.join(docsDirectory, `${normalizedSlug}.mdx`);

  return existsSync(mdPath) || existsSync(mdxPath);
}

export async function doesDocExist(slug: string): Promise<boolean> {
  const normalizedSlug = slug.replace(/\//g, path.sep);
  const mdPath = path.join(docsDirectory, `${normalizedSlug}.md`);
  const mdxPath = path.join(docsDirectory, `${normalizedSlug}.mdx`);

  try {
    await fs.access(mdPath);
    return true;
  } catch {
    try {
      await fs.access(mdxPath);
      return true;
    } catch {
      return false;
    }
  }
}

export async function getDocContent(slug: string): Promise<string | null> {
  const normalizedSlug = slug.replace(/\//g, path.sep);
  const mdPath = path.join(docsDirectory, `${normalizedSlug}.md`);
  const mdxPath = path.join(docsDirectory, `${normalizedSlug}.mdx`);

  try {
    return await fs.readFile(mdPath, 'utf8');
  } catch {
    try {
      return await fs.readFile(mdxPath, 'utf8');
    } catch {
      return null;
    }
  }
}

export async function getAllDocs(): Promise<string[]> {
  const docs: string[] = [];

  async function scanDirectory(dir: string, basePath: string = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        await scanDirectory(fullPath, relativePath);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
        // Add markdown files to the list
        const slug = relativePath.replace(/\.(md|mdx)$/, '');
        docs.push(slug);
      }
    }
  }

  await scanDirectory(docsDirectory);
  return docs;
}
