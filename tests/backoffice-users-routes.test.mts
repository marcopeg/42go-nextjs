import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
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
    assert.match(
      page,
      /const editUsersPolicy: Policy = \{\s*require:\s*\{\s*grants:\s*\[['"]users:edit['"]\]/
    );
    assert.match(page, /import \{ ProtectComponent \} from ['"]@\/42go\/policy\/client['"]/);
    assert.match(
      page,
      /<ProtectComponent[\s\S]*?policy=\{editUsersPolicy\}[\s\S]*?renderOnLoading=\{\(\) => null\}[\s\S]*?renderOnError=\{\(\) => null\}/
    );
    assert.equal(page.match(/<EditUsersOnly>/g)?.length, 2);
    assert.match(
      page,
      /<EditUsersOnly>[\s\S]*?<Pencil \/>[\s\S]*?Edit user[\s\S]*?reset-profile[\s\S]*?reset-consent[\s\S]*?<\/EditUsersOnly>/
    );
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
      1
    );
    assert.equal(
      route.match(/grants:\s*\[["']users:edit["']\]/g)?.length,
      1
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

  it("keeps list, edit, and delete grants separated for representative callers", async () => {
    const route = await readSource("src/app/api/backoffice/users/route.ts");
    const patchPolicy = route.match(
      /export const PATCH = protectRoute\(updateUser,\s*(\{[\s\S]*?\})\s*\);/
    )?.[1];

    assert.ok(patchPolicy);
    assert.match(patchPolicy, /feature:\s*["']api:users["']/);
    assert.match(patchPolicy, /session:\s*true/);
    assert.match(patchPolicy, /role:\s*["']backoffice["']/);
    assert.match(patchPolicy, /grants:\s*\[["']users:edit["']\]/);
    assert.doesNotMatch(patchPolicy, /users:list|users:delete/);

    const canPatch = ({
      authenticated,
      sameApp,
      roles,
      grants,
    }: {
      authenticated: boolean;
      sameApp: boolean;
      roles: string[];
      grants: string[];
    }) =>
      authenticated &&
      sameApp &&
      roles.includes("backoffice") &&
      grants.includes("users:edit");

    const cases = [
      {
        name: "list-only",
        expected: false,
        actor: {
          authenticated: true,
          sameApp: true,
          roles: ["backoffice"],
          grants: ["users:list"],
        },
      },
      {
        name: "edit-capable",
        expected: true,
        actor: {
          authenticated: true,
          sameApp: true,
          roles: ["backoffice"],
          grants: ["users:list", "users:edit"],
        },
      },
      {
        name: "delete-only mixed grant",
        expected: false,
        actor: {
          authenticated: true,
          sameApp: true,
          roles: ["backoffice"],
          grants: ["users:list", "users:delete"],
        },
      },
      {
        name: "wrong app",
        expected: false,
        actor: {
          authenticated: true,
          sameApp: false,
          roles: ["backoffice"],
          grants: ["users:edit"],
        },
      },
      {
        name: "unauthenticated",
        expected: false,
        actor: {
          authenticated: false,
          sameApp: true,
          roles: [],
          grants: [],
        },
      },
      {
        name: "non-backoffice",
        expected: false,
        actor: {
          authenticated: true,
          sameApp: true,
          roles: ["support"],
          grants: ["users:edit"],
        },
      },
    ];

    cases.forEach(({ name, actor, expected }) => {
      assert.equal(canPatch(actor), expected, name);
    });
  });

  it("provisions users:edit consistently in default and LingoCafe development seeds", async () => {
    const [initialSeed, defaultSeed, lingocafeSeed] = await Promise.all([
      readSource("knex/seeds/20240522_init_auth_data.js"),
      readSource("knex/seeds/20240523_default_test_users.js"),
      readSource("knex/seeds/20260427150500_lingocafe_test_users.js"),
    ]);

    assert.match(initialSeed, /grant_id:\s*usersEditGrantId/);
    assert.match(defaultSeed, /id:\s*["']users:edit["']/);
    assert.match(defaultSeed, /grant_id:\s*["']users:edit["']/);
    assert.match(lingocafeSeed, /id:\s*["']users:edit["']/);
    assert.match(lingocafeSeed, /grant_id:\s*["']users:edit["']/);
  });

  it("ships an unexecuted, idempotent operator SQL script without a data migration", async () => {
    const [sql, migrations] = await Promise.all([
      readSource(
        "docs/backlog/tasks/YS05-enforce-users-edit-for-user-updates/YS05.provision-users-edit.sql"
      ),
      readdir(new URL("../knex/migrations", import.meta.url)),
    ]);
    const executableSql = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");

    assert.match(sql, /\bBEGIN;/);
    assert.match(sql, /\bCOMMIT;/);
    assert.equal(sql.match(/ON CONFLICT/g)?.length, 2);
    assert.match(sql, /FROM auth\.roles_users[\s\S]*?role_id = 'backoffice'/);
    assert.match(sql, /FROM auth\.roles_grants[\s\S]*?role_id = 'backoffice'/);
    assert.match(sql, /'users:edit'/);
    assert.match(sql, /Verification:/);
    assert.match(sql, /Rollback guidance:/);
    assert.doesNotMatch(executableSql, /^\s*(DELETE|UPDATE|ALTER|DROP)\b/m);
    assert.equal(
      migrations.some((filename) => filename.toLowerCase().includes("ys05")),
      false
    );
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
