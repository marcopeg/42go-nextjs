import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("LingoCafe demo admin and Jane seed current required-consent evidence", async () => {
  const [config, seed] = await Promise.all([
    readSource("src/config/lingocafe/config.ts"),
    readSource("knex/seeds/20260427151000.lingocafe.data.js"),
  ]);

  const termsStatement = "I agree to the Terms of Service";
  const privacyStatement = "I have read and understood the Privacy Policy";

  assert.match(config, /I agree to the \[Terms of Service\]/);
  assert.match(config, /I have read and understood the \[Privacy Policy\]/);
  assert.match(seed, new RegExp(`statement: "${termsStatement}"`));
  assert.match(seed, new RegExp(`statement: "${privacyStatement}"`));
  assert.equal(
    seed.match(/where\(\{ id: admin\.id \}\)\.update\(/g)?.length,
    1
  );
  assert.match(seed, /profile:\s*\{\s*ownLang: "en",\s*targetLang: "sv",\s*targetLevel: "a2",\s*\}/);
  assert.match(seed, /consent: acceptedRequiredConsent/);
});
