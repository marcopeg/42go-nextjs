import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createQuicklistConnectionCode } from "../src/lib/quicklists/connection-code.ts";
import {
  createQuicklistApiToken,
  getQuicklistApiTokenPrefix,
  hashQuicklistApiToken,
  parseQuicklistBearerToken,
  quicklistTokenHashMatches,
} from "../src/lib/quicklists/server/api-token.ts";

describe("QuickList connection code", () => {
  it("packages the normalized origin and token as versioned Base64URL", () => {
    const token = "qlExampleToken123";
    const code = createQuicklistConnectionCode(
      "https://quicklist.example:8443/profile?ignored=true",
      token
    );
    const encoded = code.slice("qlc1_".length);
    const decoded = JSON.parse(
      Buffer.from(encoded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    );

    assert.match(code, /^qlc1_[A-Za-z0-9_-]+$/);
    assert.deepEqual(decoded, {
      v: 1,
      baseUrl: "https://quicklist.example:8443",
      token,
    });
  });
});

describe("QuickList personal API tokens", () => {
  it("creates long alphanumeric tokens", () => {
    const token = createQuicklistApiToken();

    assert.match(token, /^ql[A-Za-z0-9]{43}$/);
    assert.equal(getQuicklistApiTokenPrefix(token), token.slice(0, 12));
  });

  it("hashes deterministically and compares equal-length hashes safely", () => {
    const first = hashQuicklistApiToken("ql_first-token-value");
    const firstAgain = hashQuicklistApiToken("ql_first-token-value");
    const second = hashQuicklistApiToken("ql_second-token-value");

    assert.equal(first, firstAgain);
    assert.equal(quicklistTokenHashMatches(first, firstAgain), true);
    assert.equal(quicklistTokenHashMatches(first, second), false);
    assert.equal(quicklistTokenHashMatches(first, "bad"), false);
  });

  it("accepts only a single valid Bearer credential", () => {
    const token = createQuicklistApiToken();

    assert.equal(parseQuicklistBearerToken(`Bearer ${token}`), token);
    assert.equal(parseQuicklistBearerToken(`bearer ${token}`), token);
    assert.equal(
      parseQuicklistBearerToken("Bearer ql_legacy-token_value"),
      "ql_legacy-token_value"
    );
    assert.equal(parseQuicklistBearerToken(token), null);
    assert.equal(parseQuicklistBearerToken("Bearer short"), null);
    assert.equal(parseQuicklistBearerToken(`Bearer ${token} extra`), null);
    assert.equal(parseQuicklistBearerToken(null), null);
  });
});
