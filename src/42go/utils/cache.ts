interface CacheEntry {
  content: string | number | object;
  readTime: number;
}

export class Cache {
  private store: Record<string, CacheEntry> = {};

  read(key: string, expiryMs: number = 0): string | number | object | null {
    const entry = this.store[key];
    if (!entry) return null;
    if (expiryMs > 0) {
      if (Date.now() - entry.readTime < expiryMs) {
        return entry.content;
      }
      return null;
    }
    // expiryMs <= 0: do not check expiration, always return content
    return entry.content;
  }

  set(key: string, content: string | number | object): void {
    this.store[key] = { content, readTime: Date.now() };
  }
}
