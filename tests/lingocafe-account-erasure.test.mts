import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("LingoCafe account erasure explicitly deletes conversation user state", async () => {
  const handler = await readSource(
    "src/config/lingocafe/account-erasure.server.ts"
  );

  assert.match(handler, /trx\(\s*["']lingocafe\.conversation_reads["']\s*\)/);
  assert.match(handler, /trx\(\s*["']lingocafe\.conversation_stars["']\s*\)/);
  assert.equal(
    handler.match(/\.where\(\{ user_id: targetUser\.id \}\)/g)?.length,
    3
  );
});

test("LingoCafe account erasure reports each conversation deletion count", async () => {
  const handler = await readSource(
    "src/config/lingocafe/account-erasure.server.ts"
  );

  assert.match(
    handler,
    /conversationReads:\s*deletedConversationReads/
  );
  assert.match(
    handler,
    /conversationStars:\s*deletedConversationStars/
  );
  assert.match(handler, /booksProgress:\s*deletedProgress/);
});
