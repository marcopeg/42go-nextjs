import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { quickShareResourceCatalog, quickShareResourceTypeSchema } from "../src/lib/quickshare/resource-catalog.ts";
import { normalizeQuickShareHandle, quickShareCustomIdSchema, quickShareHandleSchema } from "../src/lib/quickshare/server/validation.ts";

describe("QuickShare foundation contracts", () => {
  it("has one authoritative resource-type vocabulary", () => {
    assert.deepEqual(quickShareResourceCatalog.map((item) => item.id), ["text", "markdown", "web-page", "template"]);
    assert.equal(quickShareResourceTypeSchema.safeParse("unknown").success, false);
  });

  it("normalizes and reserves handle and custom namespaces", () => {
    assert.equal(normalizeQuickShareHandle("  Chuck Norris  "), "chuck-norris");
    assert.equal(quickShareHandleSchema.safeParse("assets").success, false);
    assert.equal(quickShareCustomIdSchema.safeParse("releases").success, false);
    assert.equal(quickShareCustomIdSchema.safeParse("share-42").success, true);
  });

  it("models app-scoped account ownership and cross-state route claims in migration", async () => {
    const migration = await readFile("knex/migrations/20260801150000_quickshare_foundation.js", "utf8");
    assert.match(migration, /uq_quickshare_accounts_app_id_id/);
    assert.match(migration, /resource_route_claims/);
    assert.match(migration, /uq_quickshare_route_claim_short/);
    assert.match(migration, /uq_quickshare_route_claim_custom/);
    assert.match(migration, /uq_quickshare_resources_app_account_id/);
    assert.match(migration, /app_id", "account_id", "resource_id/);
    assert.match(migration, /assert_published_release_owner/);
    assert.match(migration, /release_versions_immutable/);
  });

  it("keeps default-app rows distinct and uses server-derived context", async () => {
    const [registry, route, config] = await Promise.all([
      readFile("src/42go/users/account-erasure/registry.server.ts", "utf8"),
      readFile("src/app/api/(quickshare)/quickshare/route.ts", "utf8"),
      readFile("src/config/default/config.ts", "utf8"),
    ]);
    assert.match(registry, /default: \[\.\.\.quicklistHandlers, \.\.\.quickshareHandlers\]/);
    assert.match(route, /getAppID\(\)/);
    assert.match(route, /getSessionUserId\(\)/);
    assert.match(config, /page:quickshare/);
  });
});
