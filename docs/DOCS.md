---
title: Documentation Caching System
description: How the Markdown documentation caching system works
---

# Documentation Caching System

## Overview

The application implements a memory caching system for markdown documentation files to optimize performance and reduce disk I/O operations. This system caches documentation content in memory after initial load, serving subsequent requests from memory instead of reading from disk repeatedly.

## How It Works

When a documentation page is requested:

1. The system first checks if the requested document exists in the cache
2. If found and not expired, it returns the cached document immediately
3. If not found or expired, it reads the file from disk, stores it in the cache, and then returns it

The cache implementation:

- Updates the last access timestamp when a document is accessed
- Removes the oldest entries when the cache reaches its size limit
- Automatically expires entries that haven't been accessed within the configured time period

## Configuration

The caching system is configurable through environment variables:

| Variable            | Format           | Default | Description                                        |
| ------------------- | ---------------- | ------- | -------------------------------------------------- |
| `MD_CACHE_DURATION` | `<number><unit>` | `30m`   | How long documents stay in cache since last access |
| `MD_CACHE_MAX_SIZE` | `<number><unit>` | `10mb`  | Maximum memory allocated for caching               |
| `MD_CACHE_SKIP`     | `true`/`false`   | `false` | Force disable caching regardless of environment    |

### Duration Format

For `MD_CACHE_DURATION`, the following units are supported:

- `s`: seconds (e.g., `60s` for 60 seconds)
- `m`: minutes (e.g., `30m` for 30 minutes)
- `h`: hours (e.g., `1h` for 1 hour)

### Size Format

For `MD_CACHE_MAX_SIZE`, the following units are supported:

- `kb`: kilobytes (e.g., `500kb`)
- `mb`: megabytes (e.g., `10mb`)
- `gb`: gigabytes (e.g., `1gb`)

## When Caching is Skipped

The caching system will automatically be disabled in the following scenarios:

1. When running in development environment (`NODE_ENV=development`)
2. When explicitly disabled via environment variable (`MD_CACHE_SKIP=true`)

Disabling caching in development mode ensures that changes to documentation files are immediately reflected without having to restart the server or wait for cache expiration.

## Performance Benefits

Implementing this caching mechanism provides several benefits:

- **Reduced Disk I/O**: Frequently accessed documents are served from memory
- **Faster Response Times**: Reading from memory is significantly faster than disk access
- **Decreased Server Load**: Less CPU and I/O overhead for serving documentation pages
- **Lower Latency**: Users experience faster page loads for popular documentation

## Memory Management

The caching system includes smart memory management features:

1. **Size Limiting**: The cache will never exceed the configured maximum size
2. **LRU Eviction**: When the cache reaches capacity, the least recently used documents are removed first
3. **Self-Cleaning**: Expired documents are automatically removed when accessed
4. **Oversized Item Protection**: Documents larger than the maximum cache size are not cached

## Implementation Details

The cache is implemented as a singleton instance that persists throughout the application's lifecycle. Size calculations account for both the document content and metadata to ensure accurate memory usage estimates.
