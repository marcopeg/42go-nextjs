---
title: Getting Started
description: Develop multiple projects from a single NextJS codebase
date: 2025-04-08
author: Marco Pegoraro
---

[42Go NextJS](https://next.42go.dev) is a boilerplate that helps you create and maintain **multiple independent projects from a single _NextJS_ codebase**.

This was my personal pain point when considering to buy or create a _NextJS_ boilerplate:

> I have many little projects to run, and I didn't want to spent time moving features across, or updating dependencies.

After all, vibe coding is cool and let me move fast. But it generates code that is far from being modular and portable!

Here are the main principles that lead the development of this boilerplate:

# Development Environment

Once you get [access to the codebase](/buy), clone it locally:

```bash
git clone https://github.com/marcopeg/42go-next-multi
```

> You only need [NodeJS 18+](https://nodejs.org) to create your project.

Next, you need to setup a PostgreSQL database.

**Via Docker:**

```bash
make db
```

[get more info](./db-docker.md)

**Via NeonDB:**

[get more info](./db-neon.md)

# Dynamic Configuration

[[to be completed]]

# Feature Flags

[[to be completed]]

# Reusable & Configurable Features

[[to be completed]]
