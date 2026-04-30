---
title: Documentation Project
excerpt: The documentation section builds on top of Markdown files
author: Marco Pegoraro
date: 2025-08-01
---

The _Documentation_ feature allows to render a feature rich documentation section based on _Markdown_ files.

## Configuration

This is an example of configuration for the _Documentation_ feature:

```js
const config = {
  public: {
    docs: {
      source: "/path/to/docs/root",
      cache: {
        duration: 1000,
      },
    },
  },
};
```

### public.docs.source

Configure the **root of your documentation** project as an absolute path in the host system or container.

> `public.docs.source` acts as a _Feature Flag_ in itself, if not defined, the entire functionality is disabled and any `/docs/*` routes will yield a `404 Not Found` unless explicitly implemented.

### public.docs.cache.duration

Configure the caching behavior for the documents that read from the _File System_.

- `-1`: no cache, every page load will hit the FS for reading the original files
- `0`: permanent cache, once a file is loaded the first time, it will be kept in memory forever
- `1000`: cache duration in milliseconds

---

## Root Folder Structure

Here is an example of a suggested structure for a documentation project:

```text
docs/
├── README.md
├── SIDEBAR.md
├── another-doc.md
└── foo/
    └── README.md
```

### README.md

`README.md` is rendered at the `/docs` route before listing all the available contents.

### SIDEBAR.md

`SIDEBAR.md` is rendered as **left menu** and acts as a main navigation for yoir documentation project.

> We suggest to use `# Level1` headings and lists of links in here:

```md
# Documentation

- [Getting Started](./getting-started.md)

# Features

- [Multi-App Configuration](./multiple-apps/README.md)
- [Composable Pages](./pages/README.md)
- [Docs](./docs/README.md)
```

### Content Pages

`foo/README.md` is your tipical documentation page.

> We strongly suggest to use sub-folders with the default `README.md` file (also `index.md` works) so to keep open the nesting capabilities.

---

## Front Matter

A document should expose a _Frontmatter_ that provides metadata for the page:

```md
---
title: The title
excerpt: Subtitle
author: John Doe
date: 2025-08-01
---
```

## Links

Use relative links to navigate within the documentation project.

The goal is that those links will work in your IDE as well as in the rendered website.

**Folder structure:**

```text
content-folder/
  ├── README.md
  └── sub-page/
    └── README.md/
```

**README.md (first one):**

```md
[anchor text](./sub-page/README.md)
```

## Images

> 🚧 Work in progress 🚧

The idea is to store images and other media within a content folder and to link it directly.

**Folder structure:**

```text
content-folder/
  ├── README.md
  └── image.jpg
```

**README.md**

```md
![alt text](./image.jpg)
```
