import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeAuthEmail,
  validateAuthEmail,
} from "../src/42go/auth/lib/email/validation.ts";

const validEmails = [
  ["Marco@Example.com", "marco@example.com"],
  [" marco@example.co.uk ", "marco@example.co.uk"],
  ["marco.rossi@outlook.com", "marco.rossi@outlook.com"],
  ["marco_rossi@proton.me", "marco_rossi@proton.me"],
  ["alias@privaterelay.appleid.com", "alias@privaterelay.appleid.com"],
  ["mask@mozmail.com", "mask@mozmail.com"],
  ["reader@duck.com", "reader@duck.com"],
] satisfies Array<[string, string]>;

const invalidEmails = [
  "",
  "marco",
  "marco@gmail",
  "marco@example",
  "marco@@example.com",
  "marco,rossi@example.com",
  "marco rossi@example.com",
  ".marco@example.com",
  "marco.@example.com",
  "marco..rossi@example.com",
  "marco+foo@gmail.com",
  "marco+foo@outlook.com",
  "marco+foo@example.com",
  "mar.co@gmail.com",
  "mar.co@googlemail.com",
  "reader@mailinator.com",
  "reader@temp-mail.org",
  "reader@sub.yopmail.com",
];

describe("validateAuthEmail", () => {
  it("normalizes accepted auth email addresses", () => {
    for (const [input, expected] of validEmails) {
      const result = validateAuthEmail(input);
      assert.equal(result.ok, true, input);
      if (result.ok) {
        assert.equal(result.email, expected);
      }
    }
  });

  it("rejects invalid, alias, Gmail-dot, and disposable addresses", () => {
    for (const input of invalidEmails) {
      const result = validateAuthEmail(input);
      assert.equal(result.ok, false, input);
      if (!result.ok) {
        assert.equal(result.message, "Enter a valid email address.");
      }
    }
  });

  it("throws the generic validation error from normalizeAuthEmail", () => {
    assert.equal(normalizeAuthEmail("Marco@Example.com"), "marco@example.com");
    assert.throws(
      () => normalizeAuthEmail("marco+test@gmail.com"),
      /Enter a valid email address\./
    );
  });
});
