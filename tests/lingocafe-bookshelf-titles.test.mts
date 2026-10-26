import assert from "node:assert/strict";
import test from "node:test";

import {
  extractCollectionInfo,
  parseBookTitle,
} from "../src/app/(app)/(lingocafe)/books/_components/bookshelf.ts";

test("collection badges use short localized labels with explicit or inferred numbering", () => {
  for (const [lang, wording, expected] of [
    ["sv", "Volym", "Vol. 2"],
    ["sv", "Del", "Vol. 2"],
    ["en", "Volume", "Vol. 2"],
    ["de", "Band", "Bd. 2"],
    ["de", "Bd.", "Bd. 2"],
    ["es", "Volumen", "Vol. 2"],
    ["it", "Volume", "Vol. 2"],
  ]) {
    assert.equal(
      extractCollectionInfo("startups-02", "", `Startups — ${wording} 2`, lang).volumeLabel,
      expected,
    );
    assert.equal(
      extractCollectionInfo("startups-02", "", "Startups", lang).volumeLabel,
      expected,
    );
  }
});

test("removing volume suffixes also removes their separator", () => {
  for (const suffix of [" — Vol. 1", " – Volume 1", " - Volym 1", ", Del 1", " (Vol. 1)"]) {
    assert.equal(parseBookTitle(`Startups${suffix}`, "startups-01", "sv").mainTitle, "Startups");
  }
  const parsed = parseBookTitle("Sportens värld: 20 sporter, Del 1", "sports-01", "sv");
  assert.deepEqual(parsed, { mainTitle: "Sportens värld", subtitle: "20 sporter", volumeLabel: "Vol. 1" });
  assert.equal(parseBookTitle("A title — with a dash", "novel", "en").mainTitle, "A title — with a dash");
});
