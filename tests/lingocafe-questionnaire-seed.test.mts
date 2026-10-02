import assert from "node:assert/strict";
import test from "node:test";

import knex from "knex";

import { seed } from "../knex/seeds/20260929120000.lingocafe.questionnaire-sverige.js";

test("Sverige tillsammans question marks survive Knex raw SQL conversion", async () => {
  const statements: string[] = [];
  await seed({
    transaction: async (run) =>
      run({ raw: async (sql) => statements.push(sql) }),
  });

  assert.equal(statements.length, 2);
  const client = knex({ client: "pg" }).client;
  for (const statement of statements) {
    const postgresSql = client.positionBindings(statement);
    assert.equal(postgresSql.match(/\?/g)?.length, 618);
    assert.ok(
      postgresSql.includes("Hur skiljer sig skogen ofta mellan norra och södra Sverige?"),
    );
    assert.ok(!postgresSql.includes("Sverige$37"));
  }
});
