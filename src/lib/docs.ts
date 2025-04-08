import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const docsDirectory = path.join(process.cwd(), 'docs');

// Configure cache settings from environment variables
const DEFAULT_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const DEFAULT_CACHE_MAX_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Determine whether to skip caching
const isDevelopment = process.env.NODE_ENV === 'development';
const isCacheSkipped = process.env.MD_CACHE_SKIP === 'true';
const SHOULD_CACHE = !(isDevelopment || isCacheSkipped);

// Parse cache duration from environment variable (format: 30m, 1h, etc.)
function parseDuration(durationString: string | undefined): number {
  if (!durationString) return DEFAULT_CACHE_DURATION;

  const match = durationString.match(/^(\d+)([smh])$/);
  if (!match) return DEFAULT_CACHE_DURATION;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      return DEFAULT_CACHE_DURATION;
  }
}

// Parse cache size from environment variable (format: 10MB, 1GB, etc.)
function parseSize(sizeString: string | undefined): number {
  if (!sizeString) return DEFAULT_CACHE_MAX_SIZE;

  const match = sizeString.match(/^(\d+)([kmg]b)$/i);
  if (!match) return DEFAULT_CACHE_MAX_SIZE;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'kb':
      return value * 1024;
    case 'mb':
      return value * 1024 * 1024;
    case 'gb':
      return value * 1024 * 1024 * 1024;
    default:
      return DEFAULT_CACHE_MAX_SIZE;
  }
}

const CACHE_DURATION = parseDuration(process.env.MD_CACHE_DURATION);
const CACHE_MAX_SIZE = parseSize(process.env.MD_CACHE_MAX_SIZE);

// Cache implementation
interface CacheEntry {
  data: DocFile;
  size: number;
  timestamp: number;
}

class DocCache {
  private cache = new Map<string, CacheEntry>();
  private totalSize = 0;

  // Get from cache if valid, otherwise returns null
  get(key: string): DocFile | null {
    // Skip cache if configured to do so
    if (!SHOULD_CACHE) return null;

    const entry = this.cache.get(key);

    if (!entry) return null;

    const now = Date.now();
    // Check if entry has expired
    if (now - entry.timestamp > CACHE_DURATION) {
      this.delete(key);
      return null;
    }

    // Update last access time
    entry.timestamp = now;
    return entry.data;
  }

  // Add to cache, respecting size limits
  set(key: string, data: DocFile): void {
    // Skip cache if configured to do so
    if (!SHOULD_CACHE) return;

    // Estimate size of the data (content length as bytes + metadata)
    const size = data.content.length * 2 + JSON.stringify(data.metadata).length * 2;

    // If this single item is larger than our max cache, don't cache it
    if (size > CACHE_MAX_SIZE) return;

    // Check if we need to make room in the cache
    this.ensureCapacity(size);

    // Add or update the entry
    const existing = this.cache.get(key);
    if (existing) {
      this.totalSize -= existing.size;
    }

    this.cache.set(key, {
      data,
      size,
      timestamp: Date.now(),
    });

    this.totalSize += size;
  }

  // Delete a cache entry
  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.totalSize -= entry.size;
      this.cache.delete(key);
    }
  }

  // Make room for new entries if needed
  private ensureCapacity(sizeNeeded: number): void {
    if (this.totalSize + sizeNeeded <= CACHE_MAX_SIZE) return;

    // Remove oldest entries until we have enough space
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    for (const [key] of entries) {
      this.delete(key);
      if (this.totalSize + sizeNeeded <= CACHE_MAX_SIZE) break;
    }
  }
}

// Initialize singleton cache
const docCache = new DocCache();

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

export interface DocFile {
  content: string;
  metadata: DocMetadata;
  filePath: string;
  isMdx: boolean;
}

export interface DocMetadata {
  title?: string;
  subtitle?: string;
  description?: string;
  author?: string;
  date?: string;
  publicationDate?: string;
  [key: string]: string | undefined;
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

export async function getDoc(slug: string): Promise<DocFile | null> {
  // Check cache first
  const cachedDoc = docCache.get(slug);
  if (cachedDoc) {
    return cachedDoc;
  }

  // If not in cache, read from disk
  const normalizedSlug = slug.replace(/\//g, path.sep);
  const mdPath = path.join(docsDirectory, `${normalizedSlug}.md`);
  const mdxPath = path.join(docsDirectory, `${normalizedSlug}.mdx`);
  let content: string;
  let filePath: string;
  let isMdx = false;

  try {
    content = await fs.readFile(mdPath, 'utf8');
    filePath = mdPath;
  } catch {
    try {
      content = await fs.readFile(mdxPath, 'utf8');
      filePath = mdxPath;
      isMdx = true;
    } catch {
      return null;
    }
  }

  const metadata = extractMetadata(content);

  const docFile = {
    content,
    metadata,
    filePath,
    isMdx,
  };

  // Store in cache for future requests
  docCache.set(slug, docFile);

  return docFile;
}

// Function to extract metadata from markdown/mdx frontmatter
function extractMetadata(content: string): DocMetadata {
  const metadata: DocMetadata = {};

  // Check for frontmatter between --- markers
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);

  if (match && match[1]) {
    const frontmatter = match[1];

    // Extract key-value pairs
    const lines = frontmatter.split('\n');
    for (const line of lines) {
      const keyValue = line.match(/^\s*([^:]+):\s*(.+)\s*$/);
      if (keyValue && keyValue.length >= 3) {
        const key = keyValue[1].trim();
        const value = keyValue[2].trim().replace(/^['"](.*)['"]$/, '$1'); // Remove quotes if present
        metadata[key] = value;
      }
    }
  }

  return metadata;
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

export interface DocInfo {
  slug: string;
  title?: string;
  description?: string;
}

// Get a list of all docs with basic metadata
export async function getAllDocsWithMeta(): Promise<DocInfo[]> {
  const slugs = await getAllDocs();
  const docsWithMeta: DocInfo[] = [];

  for (const slug of slugs) {
    const doc = await getDoc(slug);
    if (doc) {
      docsWithMeta.push({
        slug,
        title: doc.metadata.title,
        description: doc.metadata.description || doc.metadata.subtitle,
      });
    } else {
      docsWithMeta.push({ slug });
    }
  }

  // Sort by title if available, otherwise by slug
  return docsWithMeta.sort((a, b) => {
    if (a.title && b.title) {
      return a.title.localeCompare(b.title);
    } else if (a.title) {
      return -1; // Items with titles come first
    } else if (b.title) {
      return 1;
    }
    return a.slug.localeCompare(b.slug);
  });
}
