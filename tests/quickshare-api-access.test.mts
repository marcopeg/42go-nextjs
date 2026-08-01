import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { after, describe, it } from "node:test";

import "dotenv/config";

import quickShareApiToken from "../src/lib/quickshare/server/api-token.ts";
import quickShareDatabase from "../src/42go/db/index.ts";
import quickShareApiTokenStore from "../src/lib/quickshare/server/api-token-store.ts";

const {
  createQuickShareApiToken,
  getQuickShareApiTokenPrefix,
  hashQuickShareApiToken,
  parseQuickShareBearerToken,
  quickShareTokenHashMatches,
} = quickShareApiToken;
const { getDB } = quickShareDatabase;

const {
  authenticateQuickShareApiToken,
  createQuickShareApiTokenCredential,
  deleteQuickShareApiToken,
  getQuickShareApiTokenStatus,
  rotateQuickShareApiTokenCredential,
} = quickShareApiTokenStore;

type QuickShareApiPrincipal = {
  appId: string;
  accountId: string;
  userId: string;
};

describe("QuickShare personal API tokens", () => {
  it("creates high-entropy, exact-format credentials", () => {
    const tokens = new Set(Array.from({ length: 32 }, () => createQuickShareApiToken()));
    assert.equal(tokens.size, 32);

    for (const token of tokens) {
      assert.match(token, /^qs_[A-Za-z0-9_-]{48}$/);
      assert.equal(getQuickShareApiTokenPrefix(token), token.slice(0, 15));
    }
  });

  it("accepts one exact bearer value and compares valid hashes safely", () => {
    const token = createQuickShareApiToken();
    const first = hashQuickShareApiToken(token);
    const second = hashQuickShareApiToken(createQuickShareApiToken());

    assert.equal(parseQuickShareBearerToken(`Bearer ${token}`), token);
    assert.equal(parseQuickShareBearerToken(`bearer ${token}`), token);
    assert.equal(parseQuickShareBearerToken(token), null);
    assert.equal(parseQuickShareBearerToken(`Bearer ${token} extra`), null);
    assert.equal(parseQuickShareBearerToken("Bearer qs_short"), null);
    assert.equal(parseQuickShareBearerToken("Bearer ql_abcdefghijklmnopqrstuvwxyz0123456789"), null);
    assert.equal(quickShareTokenHashMatches(first, first), true);
    assert.equal(quickShareTokenHashMatches(first, second), false);
    assert.equal(quickShareTokenHashMatches(first, "bad"), false);
  });
});

describe("QuickShare API credential boundaries", () => {
  it("persists hash-only, app-scoped credentials with composite ownership foreign keys", async () => {
    const migration = await readFile("knex/migrations/20260801210000_quickshare_api_tokens.js", "utf8");
    assert.match(migration, /withSchema\("quickshare"\)\.createTable\("api_tokens"/);
    assert.match(migration, /uq_quickshare_api_tokens_app_user/);
    assert.match(migration, /uq_quickshare_api_tokens_hash/);
    assert.match(migration, /foreign\(\["app_id", "account_id"\]\)/);
    assert.match(migration, /foreign\(\["app_id", "user_id"\]\)/);
    assert.doesNotMatch(migration, /token_plaintext|raw_token|authorization/);
  });

  it("keeps session management and bearer authentication as separate app-scoped boundaries", async () => {
    const [sessionPrincipal, tokenStore, context, route, profileComponent] = await Promise.all([
      readFile("src/lib/quickshare/server/session-principal.ts", "utf8"),
      readFile("src/lib/quickshare/server/api-token-store.ts", "utf8"),
      readFile("src/lib/quickshare/server/api-context.ts", "utf8"),
      readFile("src/app/api/quickshare/api-access/route.ts", "utf8"),
      readFile("src/lib/quickshare/components/QuickShareApiAccessPreferences.tsx", "utf8"),
    ]);

    assert.match(sessionPrincipal, /session\.user\.appId !== appId/);
    assert.match(sessionPrincipal, /account\.app_id/);
    assert.match(sessionPrincipal, /user\.app_id/);
    assert.match(tokenStore, /user\.app_id/);
    assert.match(tokenStore, /account\.app_id/);
    assert.match(tokenStore, /account"\."user_id" = "token"\."user_id/);
    assert.match(context, /request\.headers\.get\("authorization"\)/);
    assert.doesNotMatch(context, /getServerSession/);
    assert.match(route, /getQuickShareSessionPrincipal/);
    assert.match(route, /expectedUpdatedAt/);
    assert.match(profileComponent, /JSON\.stringify\(\{ expectedUpdatedAt: status\?\.updatedAt \}\)/);
    assert.match(profileComponent, /content-type/);
    assert.doesNotMatch(route, /authorization/);
  });

  it("persists, rotates, revokes, and isolates real token records", async () => {
    const db = getDB();
    const suffix = randomUUID().replaceAll("-", "");
    const appId = `kq66-${suffix}`;
    const foreignAppId = `kq66-foreign-${suffix}`;
    const userId = randomUUID();
    const foreignUserId = randomUUID();

    await db.transaction(async (transaction) => {
      const now = new Date();
      await transaction("auth.users").insert([
        {
          app_id: appId,
          id: userId,
          email: `${suffix}@quickshare.test`,
          created_at: now,
          updated_at: now,
        },
        {
          app_id: foreignAppId,
          id: foreignUserId,
          email: `foreign-${suffix}@quickshare.test`,
          created_at: now,
          updated_at: now,
        },
      ]);
      const [account] = await transaction("quickshare.accounts")
        .insert({
          app_id: appId,
          user_id: userId,
          handle: `owner-${suffix.slice(0, 18)}`,
          normalized_handle: `owner-${suffix.slice(0, 18)}`,
        })
        .returning(["id"]);
      const [foreignAccount] = await transaction("quickshare.accounts")
        .insert({
          app_id: foreignAppId,
          user_id: foreignUserId,
          handle: `foreign-${suffix.slice(0, 16)}`,
          normalized_handle: `foreign-${suffix.slice(0, 16)}`,
        })
        .returning(["id"]);
      const principal: QuickShareApiPrincipal = {
        appId,
        accountId: account.id,
        userId,
      };
      const foreignPrincipal: QuickShareApiPrincipal = {
        appId: foreignAppId,
        accountId: foreignAccount.id,
        userId: foreignUserId,
      };

      const created = await createQuickShareApiTokenCredential(transaction, principal);
      const row = await transaction("quickshare.api_tokens")
        .where({ app_id: appId, user_id: userId })
        .first<{ token_hash: string; token_prefix: string }>();
      assert.equal(row?.token_hash, hashQuickShareApiToken(created.token));
      assert.equal(row?.token_prefix, getQuickShareApiTokenPrefix(created.token));
      assert.equal("token" in (row || {}), false);

      assert.deepEqual(
        await authenticateQuickShareApiToken(transaction, appId, `Bearer ${created.token}`),
        principal
      );
      assert.equal(
        await authenticateQuickShareApiToken(transaction, foreignAppId, `Bearer ${created.token}`),
        null
      );
      assert.equal((await getQuickShareApiTokenStatus(transaction, foreignPrincipal)).exists, false);

      const rotated = await rotateQuickShareApiTokenCredential(
        transaction,
        principal,
        created.status.updatedAt!
      );
      assert.equal(
        await authenticateQuickShareApiToken(transaction, appId, `Bearer ${created.token}`),
        null
      );
      assert.deepEqual(
        await authenticateQuickShareApiToken(transaction, appId, `Bearer ${rotated.token}`),
        principal
      );
      await assert.rejects(
        rotateQuickShareApiTokenCredential(
          transaction,
          principal,
          "2000-01-01T00:00:00.000Z"
        ),
        { code: "token_changed" }
      );
      assert.equal(await deleteQuickShareApiToken(transaction, principal), true);
      assert.equal(
        await authenticateQuickShareApiToken(transaction, appId, `Bearer ${rotated.token}`),
        null
      );

      // The outer transaction intentionally rolls back the isolated fixture.
      throw new RollbackTestTransaction();
    }).catch((error) => {
      if (!(error instanceof RollbackTestTransaction)) throw error;
    });
  });
});

class RollbackTestTransaction extends Error {}

after(async () => {
  await getDB().destroy();
});
