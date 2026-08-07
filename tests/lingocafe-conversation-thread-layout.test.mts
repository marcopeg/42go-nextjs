import assert from "node:assert/strict";
import test from "node:test";

import { buildConversationThreadLayout } from "../src/app/(app)/(lingocafe)/conversations/_components/thread-layout.ts";

test("conversation actors keep their side and repeated turns form one visual run", () => {
  // Exported corpus fixture:
  // accepting-a-fika-invitation--invitee-accepts-fika-tomorrow--sv-a1
  const layout = buildConversationThreadLayout([
    { actorId: "inviter" },
    { actorId: "invitee" },
    { actorId: "inviter" },
    { actorId: "invitee" },
    { actorId: "invitee" },
    { actorId: "inviter" },
  ]);

  assert.deepEqual(layout, [
    { side: "left", startsActorRun: true },
    { side: "right", startsActorRun: true },
    { side: "left", startsActorRun: true },
    { side: "right", startsActorRun: true },
    { side: "right", startsActorRun: false },
    { side: "left", startsActorRun: true },
  ]);
});
