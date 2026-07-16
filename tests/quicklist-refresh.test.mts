import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Ajv from "ajv";

import {
  getQuicklistAutoRefreshIntervalMs,
  quicklistProfileSchema,
  resolveQuicklistAutoRefreshLevel,
} from "../src/config/quicklist/profile-options.ts";
import {
  createQuicklistETag,
  matchesIfNoneMatch,
} from "../src/lib/quicklists/server/etag.ts";
import {
  shouldCoalesceQuicklistResumeSignal,
  shouldRunQuicklistAutoRefresh,
} from "../src/lib/quicklists/polling.ts";

describe("QuickList auto-refresh preference", () => {
  it("maps the final levels to their polling intervals", () => {
    assert.equal(getQuicklistAutoRefreshIntervalMs("off"), null);
    assert.equal(getQuicklistAutoRefreshIntervalMs("slow"), 30_000);
    assert.equal(getQuicklistAutoRefreshIntervalMs("medium"), 15_000);
    assert.equal(getQuicklistAutoRefreshIntervalMs("fast"), 5_000);
  });

  it("defaults missing and invalid values to medium", () => {
    assert.equal(resolveQuicklistAutoRefreshLevel(undefined), "medium");
    assert.equal(resolveQuicklistAutoRefreshLevel(null), "medium");
    assert.equal(resolveQuicklistAutoRefreshLevel("turbo"), "medium");
  });

  it("keeps existing empty profiles valid and rejects unsupported saved values", () => {
    const validate = new Ajv({ strict: true }).compile(quicklistProfileSchema);

    assert.equal(validate({}), true);
    assert.equal(validate({ quicklistAutoRefresh: "fast" }), true);
    assert.equal(validate({ quicklistAutoRefresh: "turbo" }), false);
  });
});

describe("QuickList conditional response token", () => {
  const representation = {
    project: {
      id: "project-1",
      title: "Groceries",
      created_at: "2026-07-16T10:00:00.000Z",
      updated_at: "2026-07-16T10:00:00.000Z",
    },
    tasks: [
      {
        id: "task-1",
        title: "Coffee",
        position: 1,
        updated_at: "2026-07-16T10:00:00.000Z",
        completed_at: null,
      },
    ],
  };

  it("is stable across object key order", () => {
    const reordered = {
      tasks: representation.tasks,
      project: {
        title: representation.project.title,
        id: representation.project.id,
        updated_at: representation.project.updated_at,
        created_at: representation.project.created_at,
      },
    };

    assert.equal(
      createQuicklistETag(representation),
      createQuicklistETag(reordered)
    );
  });

  it("changes for every visible list mutation", () => {
    const original = createQuicklistETag(representation);
    const changes = [
      { ...representation, project: { ...representation.project, title: "Weekend" } },
      {
        ...representation,
        tasks: [{ ...representation.tasks[0], title: "Tea" }],
      },
      {
        ...representation,
        tasks: [{ ...representation.tasks[0], position: 2 }],
      },
      {
        ...representation,
        tasks: [
          {
            ...representation.tasks[0],
            completed_at: "2026-07-16T10:00:00.001Z",
          },
        ],
      },
    ];

    for (const changed of changes) {
      assert.notEqual(createQuicklistETag(changed), original);
    }
  });

  it("matches standard strong, weak, list, and wildcard headers", () => {
    const etag = createQuicklistETag(representation);

    assert.equal(matchesIfNoneMatch(etag, etag), true);
    assert.equal(matchesIfNoneMatch(`W/${etag}`, etag), true);
    assert.equal(matchesIfNoneMatch(`"other", ${etag}`, etag), true);
    assert.equal(matchesIfNoneMatch("*", etag), true);
    assert.equal(matchesIfNoneMatch('"other"', etag), false);
    assert.equal(matchesIfNoneMatch(null, etag), false);
  });
});

describe("QuickList polling decisions", () => {
  it("enables scheduled and foreground checks only for non-Off levels", () => {
    assert.equal(shouldRunQuicklistAutoRefresh(null), false);
    assert.equal(shouldRunQuicklistAutoRefresh("off"), false);
    assert.equal(shouldRunQuicklistAutoRefresh("slow"), true);
    assert.equal(shouldRunQuicklistAutoRefresh("medium"), true);
    assert.equal(shouldRunQuicklistAutoRefresh("fast"), true);
  });

  it("coalesces clustered mobile foreground signals", () => {
    assert.equal(shouldCoalesceQuicklistResumeSignal(1_000, 1_749), true);
    assert.equal(shouldCoalesceQuicklistResumeSignal(1_000, 1_750), false);
  });
});
