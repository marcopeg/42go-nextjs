import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  communicationDraftSchema,
  validateResponse,
} from "../src/42go/communications/validation.ts";
import { REACTION_TEMPLATES } from "../src/42go/communications/types.ts";
import { formatRelativeTime } from "../src/42go/components/DisplayDate/format.ts";
import {
  advanceCommunicationQueue,
  getCommunicationQueuePosition,
} from "../src/42go/components/Notifications/queue.ts";
import {
  MIN_INTERSECTION_RATIO,
  QUALIFIED_DISPLAY_MS,
} from "../src/42go/components/Notifications/useQualifiedDisplay.ts";

const notification = {
  kind: "notification",
  style: "info",
  priority: 5,
  audienceMode: "everyone",
  audienceUserIds: [],
  title: "Hello",
  bodyMarkdown: "**World**",
  reactionTemplate: "acknowledge",
  interactionConfig: {},
};

describe("communication draft validation", () => {
  it("accepts each immutable authoring kind with matching fields", () => {
    assert.equal(communicationDraftSchema.safeParse(notification).success, true);
    assert.equal(
      communicationDraftSchema.safeParse({
        ...notification,
        kind: "poll",
        reactionTemplate: null,
        interactionConfig: {
          selection: "single",
          required: true,
          allowOther: true,
          allowNotes: true,
          options: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
          ],
        },
      }).success,
      true
    );
    assert.equal(
      communicationDraftSchema.safeParse({
        ...notification,
        kind: "input",
        reactionTemplate: null,
        interactionConfig: { inputType: "long", required: true },
      }).success,
      true
    );
    assert.equal(
      communicationDraftSchema.safeParse({
        ...notification,
        kind: "email",
        title: null,
        subject: "Subject",
        reactionTemplate: null,
      }).success,
      true
    );
  });

  it("enforces audience, schedule, content, and safe URL boundaries", () => {
    assert.equal(
      communicationDraftSchema.safeParse({
        ...notification,
        audienceMode: "whitelist",
      }).success,
      false
    );
    assert.equal(
      communicationDraftSchema.safeParse({
        ...notification,
        availableFrom: "2026-02-02T00:00:00.000Z",
        availableUntil: "2026-02-01T00:00:00.000Z",
      }).success,
      false
    );
    assert.equal(
      communicationDraftSchema.safeParse({
        ...notification,
        linkUrl: "javascript:alert(1)",
      }).success,
      false
    );
    assert.equal(
      communicationDraftSchema.safeParse({
        ...notification,
        title: "x".repeat(161),
      }).success,
      false
    );
    for (const audienceMode of ["everyone", "whitelist", "blacklist"]) {
      assert.equal(
        communicationDraftSchema.safeParse({
          ...notification,
          audienceMode,
          audienceUserIds:
            audienceMode === "everyone" ? [] : ["current-app-user"],
        }).success,
        true
      );
    }
  });
});

describe("communication response validation", () => {
  it("accepts only verbs defined by the selected hardcoded template", () => {
    assert.deepEqual(REACTION_TEMPLATES.yes_no, ["Yes", "No"]);
    assert.equal(
      validateResponse("notification", "yes_no", {}, { reaction: "Yes" }),
      null
    );
    assert.match(
      validateResponse("notification", "yes_no", {}, {
        reaction: "Maybe",
      }) || "",
      /not allowed/
    );
  });

  it("enforces single and multiple poll rules, Other, notes, and skip", () => {
    const single = {
      selection: "single",
      required: true,
      allowOther: true,
      allowNotes: true,
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    };
    assert.equal(
      validateResponse("poll", null, single, { optionIds: ["a"] }),
      null
    );
    assert.match(
      validateResponse("poll", null, single, {
        optionIds: ["a"],
        other: "C",
      }) || "",
      /Choose one/
    );
    assert.match(
      validateResponse("poll", null, single, { skip: true }) || "",
      /cannot be skipped/
    );
    assert.match(
      validateResponse("poll", null, single, { notes: "Only notes" }) || "",
      /required/
    );

    const multiple = { ...single, selection: "multiple" };
    assert.equal(
      validateResponse("poll", null, multiple, {
        optionIds: ["a", "b"],
        other: "C",
        notes: "Optional",
      }),
      null
    );
  });

  it("enforces standalone input requirements and limits", () => {
    assert.match(
      validateResponse(
        "input",
        null,
        { inputType: "short", required: true },
        { input: "" }
      ) || "",
      /required/
    );
    assert.match(
      validateResponse(
        "input",
        null,
        { inputType: "short", required: false },
        { input: "x".repeat(501) }
      ) || "",
      /too long/
    );
  });
});

describe("communication persistence and delivery guardrails", () => {
  it("declares same-app keys, cascades, indexes, and creator nulling", async () => {
    const migration = await readFile(
      new URL(
        "../knex/migrations/20260728170000_42go_communications.js",
        import.meta.url
      ),
      "utf8"
    );
    assert.match(migration, /primary\(\["app_id", "id"\]\)/);
    assert.match(
      migration,
      /foreign\(\["app_id", "communication_id"\]\)/
    );
    assert.match(migration, /foreign\(\["app_id", "user_id"\]\)/);
    assert.match(migration, /onDelete\("CASCADE"\)/);
    assert.match(migration, /onDelete\("SET NULL"\)/);
    assert.match(migration, /communication_display_user_idx/);
    assert.match(migration, /communication_display_message_idx/);
  });

  it("keeps email out of delivery and locks published edits", async () => {
    const service = await readFile(
      new URL("../src/42go/communications/server.ts", import.meta.url),
      "utf8"
    );
    assert.match(service, /"c\.channel": "in_app"/);
    assert.match(service, /Published communications are immutable/);
    assert.match(service, /Communication kind is immutable/);
    assert.match(service, /whereNull\("c\.aborted_at"\)/);
    assert.match(service, /whereNull\("s\.responded_at"\)/);
    assert.match(service, /available_from"\, "<="/);
    assert.match(service, /available_until"\, ">"/);
    assert.match(
      service,
      /onConflict\(\["app_id", "communication_id", "user_id", "visit_id"\]\)/
    );
  });

  it("keeps security, rendering, tracking, and placements wired", async () => {
    const [adminApi, userApi, markdown, displayHook, profile, books, projects, list] =
      await Promise.all([
        readFile(
          new URL(
            "../src/app/api/backoffice/notifications/route.ts",
            import.meta.url
          ),
          "utf8"
        ),
        readFile(
          new URL("../src/app/api/notifications/route.ts", import.meta.url),
          "utf8"
        ),
        readFile(
          new URL(
            "../src/42go/components/Markdown/Markdown.tsx",
            import.meta.url
          ),
          "utf8"
        ),
        readFile(
          new URL(
            "../src/42go/components/Notifications/useQualifiedDisplay.ts",
            import.meta.url
          ),
          "utf8"
        ),
        readFile(
          new URL("../src/app/(app)/profile/page.tsx", import.meta.url),
          "utf8"
        ),
        readFile(
          new URL(
            "../src/app/(app)/(lingocafe)/books/page.tsx",
            import.meta.url
          ),
          "utf8"
        ),
        readFile(
          new URL("../src/app/(app)/quicklists/page.tsx", import.meta.url),
          "utf8"
        ),
        readFile(
          new URL(
            "../src/app/(app)/quicklists/[id]/page.tsx",
            import.meta.url
          ),
          "utf8"
        ),
      ]);
    for (const grant of ["list", "create", "edit", "publish", "delete"]) {
      assert.match(adminApi, new RegExp(`notifications:${grant}`));
    }
    assert.match(adminApi, /role: "backoffice"/);
    assert.match(userApi, /session: true/);
    assert.match(userApi, /getSessionUserId/);
    assert.match(markdown, /rehypeSanitize/);
    assert.match(displayHook, /document\.visibilityState/);
    assert.match(displayHook, /IntersectionObserver/);
    for (const placement of [profile, books, projects, list]) {
      assert.match(placement, /NotificationCenter/);
    }
  });
});

describe("relative communication dates", () => {
  it("formats past and future values correctly", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    assert.equal(
      formatRelativeTime(new Date("2026-07-28T11:55:00.000Z"), now),
      "5 minutes ago"
    );
    assert.equal(
      formatRelativeTime(new Date("2026-07-28T12:05:00.000Z"), now),
      "in 5 minutes"
    );
  });
});

describe("notification container behavior", () => {
  it("handles empty and multiple-message queues without refetching", () => {
    assert.deepEqual(advanceCommunicationQueue([]), []);
    assert.deepEqual(
      advanceCommunicationQueue([{ id: "one" }, { id: "two" }] as never),
      [{ id: "two" }]
    );
    assert.deepEqual(getCommunicationQueuePosition(0, 3), {
      current: 1,
      total: 3,
    });
    assert.deepEqual(getCommunicationQueuePosition(2, 0), {
      current: 2,
      total: 2,
    });
  });

  it("uses the qualified display threshold and duration", () => {
    assert.equal(MIN_INTERSECTION_RATIO, 0.5);
    assert.equal(QUALIFIED_DISPLAY_MS, 10_000);
  });

  it("keeps the full notifications page stacked and history lazy", async () => {
    const [center, page, admin, styles, plainList, appLayout] = await Promise.all([
      readFile(
        new URL(
          "../src/42go/components/Notifications/NotificationCenter.tsx",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(
        new URL("../src/app/(app)/notifications/page.tsx", import.meta.url),
        "utf8"
      ),
      readFile(
        new URL(
          "../src/app/(app)/backoffice/notifications/page.tsx",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(
        new URL(
          "../src/42go/components/Notifications/style.ts",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(
        new URL(
          "../src/42go/components/PlainList/PlainList.tsx",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(
        new URL(
          "../src/42go/layouts/app/AppLayout.tsx",
          import.meta.url
        ),
        "utf8"
      ),
    ]);

    assert.match(center, /displayMode === "list"/);
    assert.match(center, /key=\{items\[0\]\.id\}/);
    assert.match(center, /grid-rows-\[0fr\]/);
    assert.match(center, /requestAnimationFrame/);
    assert.match(center, /: 200;/);
    assert.match(styles, /border-amber-400/);
    assert.match(page, /displayMode="list"/);
    assert.doesNotMatch(page, /setHistoryOpen\(true\)/);
    assert.match(page, /You&apos;re all set!/);
    assert.match(page, /has-\[>svg\]:px-0/);
    assert.equal(
      admin.includes('placeholder={`Option ${index + 1}`}'),
      true
    );
    assert.match(admin, /<Switch/);
    assert.match(admin, /Add description/);
    assert.match(admin, /const CompactChoice/);
    assert.match(admin, /const CommunicationSummary/);
    assert.match(admin, /Poll options/);
    assert.match(admin, /<Markdown source=\{item\.bodyMarkdown\}/);
    assert.doesNotMatch(admin, /subtitle="Communicate with users in this app"/);
    assert.match(admin, /communicationStyleMap\[item\.style\]\.className/);
    assert.match(admin, /flushMobileTop/);
    assert.match(admin, /<PlainList flushMobileTop>/);
    assert.match(plainList, /flushMobileTop && "border-t-0 md:border-t"/);
    assert.doesNotMatch(plainList, /-mt-6/);
    assert.match(appLayout, /flushMobileTop \? "pt-0 md:pt-6" : "pt-6"/);
  });
});
