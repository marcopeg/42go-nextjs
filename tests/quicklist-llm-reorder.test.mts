import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildQuicklistReorderRepresentation,
  evaluateQuicklistIfMatch,
  orderQuicklistRequestedPositions,
  quicklistReorderRequestSchema,
} from "../src/lib/quicklists/reorder.ts";
import { resolveQuicklistSortingInstructions } from "../src/lib/quicklists/settings.ts";
import { createQuicklistETag } from "../src/lib/quicklists/server/etag.ts";
import {
  countQuicklistUnicodeCharacters,
  quicklistItemTextSchema,
  quicklistListNameSchema,
  quicklistSortingInstructionsRequestSchema,
  quicklistSortingInstructionsSchema,
} from "../src/lib/quicklists/validation.ts";

const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
];

describe("QuickList text contracts", () => {
  it("counts Unicode code points instead of UTF-16 code units", () => {
    assert.equal("😀".length, 2);
    assert.equal(countQuicklistUnicodeCharacters("😀"), 1);
  });

  it("trims and caps list names and item text at 250 characters", () => {
    assert.equal(quicklistListNameSchema.parse("  Shopping  "), "Shopping");
    assert.equal(quicklistItemTextSchema.parse("  Milk  "), "Milk");
    assert.equal(quicklistListNameSchema.safeParse("x".repeat(250)).success, true);
    assert.equal(quicklistListNameSchema.safeParse("x".repeat(251)).success, false);
    assert.equal(quicklistItemTextSchema.safeParse("😀".repeat(250)).success, true);
    assert.equal(quicklistItemTextSchema.safeParse("😀".repeat(251)).success, false);
  });

  it("trims, clears, and caps sorting instructions at 4,000 characters", () => {
    assert.equal(
      quicklistSortingInstructionsSchema.parse("  Produce first.  "),
      "Produce first."
    );
    assert.equal(quicklistSortingInstructionsSchema.parse("   "), "");
    assert.equal(
      quicklistSortingInstructionsSchema.safeParse("x".repeat(4_000)).success,
      true
    );
    assert.equal(
      quicklistSortingInstructionsSchema.safeParse("x".repeat(4_001)).success,
      false
    );
  });

  it("resolves persisted instructions without trusting invalid settings", () => {
    assert.equal(
      resolveQuicklistSortingInstructions({
        mode: "todo",
        sortingInstructions: "Aisle order",
      }),
      "Aisle order"
    );
    assert.equal(resolveQuicklistSortingInstructions({ sortingInstructions: 3 }), "");
    assert.equal(resolveQuicklistSortingInstructions(null), "");
  });

  it("accepts only a strict sorting-instructions mutation envelope", () => {
    assert.deepEqual(
      quicklistSortingInstructionsRequestSchema.parse({
        sortingInstructions: "  Produce first.  ",
      }),
      { sortingInstructions: "Produce first." }
    );
    assert.equal(
      quicklistSortingInstructionsRequestSchema.safeParse({
        sortingInstructions: "",
      }).success,
      true
    );
    assert.equal(
      quicklistSortingInstructionsRequestSchema.safeParse({
        sortingInstructions: "Produce first.",
        list: "Shopping",
      }).success,
      false
    );
    assert.equal(
      quicklistSortingInstructionsRequestSchema.safeParse({
        sortingInstructions: "x".repeat(4_001),
      }).success,
      false
    );
  });
});

describe("QuickList LLM reorder contract", () => {
  const representation = buildQuicklistReorderRepresentation(
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "Shopping",
      sortingInstructions: "Produce first.",
    },
    [
      {
        id: ids[0],
        title: "Apples",
        position: 1,
        completed_at: new Date(),
      },
      {
        id: ids[1],
        title: "Coffee",
        position: 2,
        completed_at: null,
      },
    ]
  );

  it("returns only list context plus item id, text, and position", () => {
    assert.deepEqual(representation, {
      list: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Shopping",
        sortingInstructions: "Produce first.",
      },
      items: [
        { id: ids[0], text: "Apples", position: 1 },
        { id: ids[1], text: "Coffee", position: 2 },
      ],
    });
    assert.equal(JSON.stringify(representation).includes("completed"), false);
  });

  it("changes ETag for every visible reorder input", () => {
    const original = createQuicklistETag(representation);
    const changedName = {
      ...representation,
      list: { ...representation.list, name: "Weekend" },
    };
    const changedInstructions = {
      ...representation,
      list: {
        ...representation.list,
        sortingInstructions: "Alphabetical.",
      },
    };
    const changedText = {
      ...representation,
      items: [{ ...representation.items[0], text: "Pears" }, representation.items[1]],
    };
    const changedPosition = {
      ...representation,
      items: [{ ...representation.items[0], position: 2 }, representation.items[1]],
    };

    for (const changed of [
      changedName,
      changedInstructions,
      changedText,
      changedPosition,
    ]) {
      assert.notEqual(createQuicklistETag(changed), original);
    }
  });

  it("requires one matching strong If-Match value", () => {
    const etag = createQuicklistETag(representation);

    assert.equal(evaluateQuicklistIfMatch(null, etag), "missing");
    assert.equal(evaluateQuicklistIfMatch("", etag), "missing");
    assert.equal(evaluateQuicklistIfMatch("*", etag), "malformed");
    assert.equal(evaluateQuicklistIfMatch(`W/${etag}`, etag), "malformed");
    assert.equal(evaluateQuicklistIfMatch(`${etag}, "other"`, etag), "malformed");
    assert.equal(evaluateQuicklistIfMatch('"other"', etag), "stale");
    assert.equal(evaluateQuicklistIfMatch(etag, etag), "match");
  });

  it("accepts only a complete unique gapless ID/position order", () => {
    assert.deepEqual(
      orderQuicklistRequestedPositions(ids, [
        { id: ids[0], position: 2 },
        { id: ids[1], position: 1 },
      ]),
      [ids[1], ids[0]]
    );
    assert.deepEqual(orderQuicklistRequestedPositions([], []), []);
    assert.equal(
      orderQuicklistRequestedPositions(ids, [{ id: ids[0], position: 1 }]),
      null
    );
    assert.equal(
      orderQuicklistRequestedPositions(ids, [
        { id: ids[0], position: 1 },
        { id: ids[1], position: 1 },
      ]),
      null
    );
  });

  it("rejects extra POST context at both envelope and item level", () => {
    assert.equal(
      quicklistReorderRequestSchema.safeParse({
        list: representation.list,
        items: representation.items.map(({ id, position }) => ({ id, position })),
      }).success,
      false
    );
    assert.equal(
      quicklistReorderRequestSchema.safeParse({
        items: [
          { id: ids[0], position: 1, text: "Apples" },
          { id: ids[1], position: 2 },
        ],
      }).success,
      false
    );
  });
});
