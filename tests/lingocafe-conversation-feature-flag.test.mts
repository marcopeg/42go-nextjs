import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getManagedUserFeatureFlags,
  isManagedUserFeatureEnabled,
  parseFeatureFlagsEditorValue,
  updateManagedUserFeatureFlag,
} from "../src/app/(app)/backoffice/users/managed-user-feature-flags.ts";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("LingoCafe exposes Conversations as a managed user feature", () => {
  assert.deepEqual(getManagedUserFeatureFlags("lingocafe"), [
    {
      key: "conversation",
      title: "Conversations",
      description:
        "Show the Conversations library in desktop and mobile navigation for this user.",
    },
  ]);
  assert.deepEqual(getManagedUserFeatureFlags("default"), []);
});

test("managed switches preserve unrelated flags and use literal true semantics", () => {
  const initial = JSON.stringify({ translate: true, experiment: "control" });
  const enabled = updateManagedUserFeatureFlag({
    value: initial,
    key: "conversation",
    enabled: true,
  });

  assert.deepEqual(parseFeatureFlagsEditorValue(enabled), {
    translate: true,
    experiment: "control",
    conversation: true,
  });
  assert.equal(isManagedUserFeatureEnabled(enabled, "conversation"), true);

  const disabled = updateManagedUserFeatureFlag({
    value: enabled,
    key: "conversation",
    enabled: false,
  });
  assert.deepEqual(parseFeatureFlagsEditorValue(disabled), {
    translate: true,
    experiment: "control",
    conversation: false,
  });
  assert.equal(isManagedUserFeatureEnabled(disabled, "conversation"), false);
  assert.equal(isManagedUserFeatureEnabled('{"conversation":"true"}', "conversation"), false);
});

test("invalid advanced JSON cannot be overwritten by a managed switch", () => {
  assert.equal(parseFeatureFlagsEditorValue("{"), undefined);
  assert.throws(
    () =>
      updateManagedUserFeatureFlag({
        value: "{",
        key: "conversation",
        enabled: true,
      }),
    /must be valid JSON/
  );
});

test("user administration renders the managed switch and retains advanced JSON", async () => {
  const page = await readSource("src/app/(app)/backoffice/users/page.tsx");

  assert.match(page, /getManagedUserFeatureFlags\(user\?\.appId \|\| ''\)/);
  assert.match(page, /<Switch/);
  assert.match(page, /checked=\{enabled\}/);
  assert.match(page, /updateManagedFeatureFlag\(feature\.key, checked\)/);
  assert.match(page, /disabled=\{!featureFlagsAreValid \|\| saving\}/);
  assert.match(page, /Feature flags JSON \(advanced\)/);
});

test("clean and null-flag LingoCafe users receive Conversations without overwriting later choices", async () => {
  const seed = await readSource(
    "knex/seeds/20260427150500_lingocafe_test_users.js"
  );
  const mergeBody = seed.match(/\.merge\(\{([\s\S]*?)\}\)\s*\.returning/)?.[1];

  assert.equal(seed.match(/feature_flags: \{ conversation: true \}/g)?.length, 3);
  assert.ok(mergeBody);
  assert.match(
    mergeBody,
    /feature_flags:\s*trx\.raw\([\s\S]*?COALESCE\(auth\.users\.feature_flags, EXCLUDED\.feature_flags\)/
  );
});

test("desktop and mobile Conversations entries use the same literal user flag", async () => {
  const [config, visibility] = await Promise.all([
    readSource("src/config/lingocafe/config.ts"),
    readSource("src/42go/layouts/app/menu-visibility.ts"),
  ]);

  assert.equal(config.match(/userFeatureFlag: 'conversation'/g)?.length, 2);
  assert.match(visibility, /featureFlags\?\.\[item\.userFeatureFlag\] === true/);
});
