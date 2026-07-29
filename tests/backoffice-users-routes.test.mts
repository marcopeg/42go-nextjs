import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

describe("backoffice user-administration routes", () => {
  it("serves the client page from the backoffice namespace with its existing policy", async () => {
    const page = await readSource(
      "src/app/(app)/backoffice/users/page.tsx"
    );

    assert.match(page, /feature:\s*['"]page:users['"]/);
    assert.match(page, /session:\s*true/);
    assert.match(page, /role:\s*['"]backoffice['"]/);
    assert.match(page, /grants:\s*\[['"]users:list['"]\]/);
    assert.equal(
      page.match(/fetch\(['"]\/api\/backoffice\/users['"]/g)?.length,
      4
    );
    assert.doesNotMatch(page, /fetch\(['"]\/api\/users['"]/);
  });

  it("serves every handler from the backoffice API with explicit policies", async () => {
    const route = await readSource(
      "src/app/api/backoffice/users/route.ts"
    );

    assert.match(route, /export const GET = protectRoute/);
    assert.match(route, /export const PATCH = protectRoute/);
    assert.match(route, /export const DELETE = protectRoute/);
    assert.equal(route.match(/feature:\s*["']api:users["']/g)?.length, 3);
    assert.equal(route.match(/session:\s*true/g)?.length, 3);
    assert.equal(route.match(/role:\s*["']backoffice["']/g)?.length, 3);
    assert.equal(
      route.match(/grants:\s*\[["']users:list["']\]/g)?.length,
      2
    );
    assert.equal(
      route.match(/grants:\s*\[["']users:delete["']\]/g)?.length,
      1
    );
    assert.match(route, /const appId = await getAppID\(\)/);
    assert.match(route, /\.where\(["']app_id["'], appId\)/);
    assert.match(route, /\.where\(\{ app_id: appId, id: userId \}\)/);
    assert.match(route, /runAccountErasure\(\{\s*appId,/);
  });

  it("removes the legacy page and API route files", async () => {
    await assert.rejects(
      access(new URL("../src/app/(app)/users/page.tsx", import.meta.url))
    );
    await assert.rejects(
      access(new URL("../src/app/api/users/route.ts", import.meta.url))
    );
  });

  it("points every existing AppConfig users menu entry to the new page", async () => {
    const [defaultConfig, lingocafeConfig] = await Promise.all([
      readSource("src/config/default/config.ts"),
      readSource("src/config/lingocafe/config.ts"),
    ]);

    assert.equal(
      defaultConfig.match(/href:\s*['"]\/backoffice\/users['"]/g)?.length,
      2
    );
    assert.equal(
      lingocafeConfig.match(/href:\s*['"]\/backoffice\/users['"]/g)?.length,
      1
    );
    assert.doesNotMatch(defaultConfig, /href:\s*['"]\/users['"]/);
    assert.doesNotMatch(lingocafeConfig, /href:\s*['"]\/users['"]/);
  });
});
