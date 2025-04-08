---
title: Example Documentation
subtitle: A comprehensive guide to using this feature
description: This example shows how the documentation system works
author: John Doe
date: 2024-08-01
---

# Example Documentation

This document demonstrates how our documentation system works with the new DocHeader component.

## Features

The DocHeader component displays various metadata from the markdown frontmatter:

- **Title**: The main heading of the document
- **Subtitle**: A secondary description
- **Author**: Who wrote the document
- **Publication Date**: When it was published

## Markdown Features

All standard markdown features are supported:

### Lists

- Item 1
- Item 2
  - Nested item
  - Another nested item

### Code Blocks

```javascript
function example() {
  console.log('This is a code example');
  return true;
}
```

### Tables

| Feature  | Description                              |
| -------- | ---------------------------------------- |
| Headers  | Displayed at the top of the document     |
| Markdown | Fully supported with syntax highlighting |
| Caching  | Improves performance                     |

## Conclusion

This document shows how the header is extracted from the metadata and displayed separately from the content.
