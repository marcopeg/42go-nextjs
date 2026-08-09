import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("role personas preserve scenario actor names while supplying avatars", async () => {
  const [api, types] = await Promise.all([
    readSource("src/app/api/(lingocafe)/lingocafe/_lib/conversations.ts"),
    readSource(
      "src/app/(app)/(lingocafe)/conversations/_components/types.ts"
    ),
  ]);

  assert.match(api, /"persona\.persona_type"/);
  assert.match(api, /\["archetype", "role"\]\.includes/);
  assert.match(
    api,
    /actor\.persona_type === "role" \? sourceName : selected\.displayName/
  );
  assert.match(api, /type: actor\.persona_type as "archetype" \| "role"/);
  assert.match(types, /type: "archetype" \| "role"/);
});
