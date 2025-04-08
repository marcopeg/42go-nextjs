import fs from 'fs';
import path from 'path';

const docsDirectory = path.join(process.cwd(), 'docs');

export function doesDocExist(slug: string): boolean {
  // Handle nested paths by replacing URL slashes with path separators
  const normalizedSlug = slug.replace(/\//g, path.sep);

  // Check for both .md and .mdx files
  const mdPath = path.join(docsDirectory, `${normalizedSlug}.md`);
  const mdxPath = path.join(docsDirectory, `${normalizedSlug}.mdx`);

  return fs.existsSync(mdPath) || fs.existsSync(mdxPath);
}

export function getAllDocs(): string[] {
  const docs: string[] = [];

  function scanDirectory(dir: string, basePath: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(fullPath, relativePath);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
        // Add markdown files to the list
        const slug = relativePath.replace(/\.(md|mdx)$/, '');
        docs.push(slug);
      }
    }
  }

  scanDirectory(docsDirectory);
  return docs;
}
