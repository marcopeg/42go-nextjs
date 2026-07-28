import "server-only";

import { randomUUID } from "node:crypto";
import type { Knex } from "knex";

import { getDB } from "@/42go/db";
import {
  communicationDraftSchema,
  validateResponse,
} from "./validation";
import type { CommunicationResponse } from "./types";

const TABLE = "42go_data.communications";
const AUDIENCE = "42go_data.communication_audience";
const STATE = "42go_data.communication_user_state";
const DISPLAYS = "42go_data.communication_display_events";

type DbCommunication = Record<string, unknown> & {
  id: string;
  app_id: string;
  kind: string;
  channel: string;
  audience_mode: string;
  reaction_template: string | null;
  interaction_config: unknown;
  published_at: Date | null;
  aborted_at: Date | null;
  title: string | null;
};

const iso = (value: unknown) =>
  value instanceof Date ? value.toISOString() : value ?? null;

export const serializeCommunication = (row: Record<string, unknown>) => ({
  id: row.id,
  appId: row.app_id,
  channel: row.channel,
  kind: row.kind,
  style: row.style,
  priority: row.priority,
  audienceMode: row.audience_mode,
  title: row.title,
  subject: row.subject,
  bodyMarkdown: row.body_markdown,
  linkUrl: row.link_url,
  mediaUrl: row.media_url,
  mediaType: row.media_type,
  reactionTemplate: row.reaction_template,
  interactionConfig: row.interaction_config || {},
  createdBy: row.created_by,
  creatorName: row.creator_name || null,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
  availableFrom: iso(row.available_from),
  availableUntil: iso(row.available_until),
  publishedAt: iso(row.published_at),
  abortedAt: iso(row.aborted_at),
  firstDisplayedAt: iso(row.first_displayed_at),
  reaction: row.reaction ?? null,
  response: row.response ?? null,
  skipped: row.skipped ?? false,
  respondedAt: iso(row.responded_at),
});

const applyAudience = (
  query: Knex.QueryBuilder,
  appId: string,
  userId: string,
  alias = "c"
) =>
  query.where((audience) => {
    audience
      .where(`${alias}.audience_mode`, "everyone")
      .orWhere((white) => {
        white
          .where(`${alias}.audience_mode`, "whitelist")
          .whereExists(
            getDB()(AUDIENCE + " as ca")
              .select(1)
              .whereRaw(`ca.app_id = ${alias}.app_id`)
              .whereRaw(`ca.communication_id = ${alias}.id`)
              .where({ "ca.app_id": appId, "ca.user_id": userId })
          );
      })
      .orWhere((black) => {
        black
          .where(`${alias}.audience_mode`, "blacklist")
          .whereNotExists(
            getDB()(AUDIENCE + " as ca")
              .select(1)
              .whereRaw(`ca.app_id = ${alias}.app_id`)
              .whereRaw(`ca.communication_id = ${alias}.id`)
              .where({ "ca.app_id": appId, "ca.user_id": userId })
          );
      });
  });

export const listEligibleCommunications = async (
  appId: string,
  userId: string
) => {
  const db = getDB();
  const now = db.fn.now();
  const query = db(TABLE + " as c")
    .leftJoin(STATE + " as s", function joinState() {
      this.on("s.app_id", "=", "c.app_id")
        .andOn("s.communication_id", "=", "c.id")
        .andOnVal("s.user_id", "=", userId);
    })
    .select("c.*")
    .where({ "c.app_id": appId, "c.channel": "in_app" })
    .whereNotNull("c.published_at")
    .whereNull("c.aborted_at")
    .whereNull("s.responded_at")
    .where((window) =>
      window.whereNull("c.available_from").orWhere("c.available_from", "<=", now)
    )
    .where((window) =>
      window.whereNull("c.available_until").orWhere("c.available_until", ">", now)
    )
    .orderBy("c.priority", "desc")
    .orderBy("c.published_at", "desc");
  applyAudience(query, appId, userId);
  return (await query).map(serializeCommunication);
};

export const listCommunicationHistory = async (
  appId: string,
  userId: string,
  cursor: string | null,
  limit = 10
) => {
  const db = getDB();
  const query = db(TABLE + " as c")
    .join(STATE + " as s", function joinState() {
      this.on("s.app_id", "=", "c.app_id")
        .andOn("s.communication_id", "=", "c.id")
        .andOnVal("s.user_id", "=", userId);
    })
    .select("c.*", "s.first_displayed_at", "s.reaction", "s.response", "s.skipped", "s.responded_at")
    .where({ "c.app_id": appId, "c.channel": "in_app" })
    .whereNull("c.aborted_at")
    .whereNotNull("s.responded_at")
    .orderBy("s.responded_at", "desc")
    .orderBy("c.id", "desc")
    .limit(limit + 1);
  if (cursor) query.where("s.responded_at", "<", new Date(cursor));
  const rows = await query;
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(serializeCommunication);
  return {
    items,
    nextCursor: hasMore ? String(items.at(-1)?.respondedAt || "") : null,
  };
};

export const recordQualifiedDisplay = async (
  appId: string,
  userId: string,
  communicationId: string,
  visitId: string
) => {
  const eligible = await listEligibleCommunications(appId, userId);
  if (!eligible.some((item) => item.id === communicationId)) {
    throw new Error("Communication is not eligible.");
  }
  const db = getDB();
  await db.transaction(async (trx) => {
    const timestamp = trx.fn.now();
    await trx(STATE)
      .insert({
        app_id: appId,
        communication_id: communicationId,
        user_id: userId,
        first_displayed_at: timestamp,
        updated_at: timestamp,
      })
      .onConflict(["app_id", "communication_id", "user_id"])
      .merge({
        first_displayed_at: trx.raw(
          `COALESCE("42go_data"."communication_user_state"."first_displayed_at", EXCLUDED.first_displayed_at)`
        ),
        updated_at: timestamp,
      });
    await trx(DISPLAYS)
      .insert({
        app_id: appId,
        communication_id: communicationId,
        user_id: userId,
        visit_id: visitId,
      })
      .onConflict(["app_id", "communication_id", "user_id", "visit_id"])
      .ignore();
  });
};

export const respondToCommunication = async (
  appId: string,
  userId: string,
  communicationId: string,
  response: CommunicationResponse
) => {
  const db = getDB();
  const row = (await db(TABLE + " as c")
    .select("c.*")
    .where({ "c.app_id": appId, "c.id": communicationId, "c.channel": "in_app" })
    .whereNotNull("c.published_at")
    .whereNull("c.aborted_at")
    .first()) as DbCommunication | undefined;
  if (!row) throw new Error("Communication not found.");
  const eligibility = await listEligibleCommunications(appId, userId);
  const existing = await db(STATE)
    .where({ app_id: appId, communication_id: communicationId, user_id: userId })
    .first();
  if (existing?.responded_at) return serializeCommunication({ ...row, ...existing });
  if (!eligibility.some((item) => item.id === communicationId)) {
    throw new Error("Communication is not eligible.");
  }
  const error = validateResponse(
    row.kind,
    row.reaction_template as never,
    row.interaction_config,
    response
  );
  if (error) throw new Error(error);
  const timestamp = db.fn.now();
  const state = {
    app_id: appId,
    communication_id: communicationId,
    user_id: userId,
    reaction: response.reaction || null,
    response: response,
    skipped: response.skip === true,
    responded_at: timestamp,
    updated_at: timestamp,
  };
  await db(STATE)
    .insert(state)
    .onConflict(["app_id", "communication_id", "user_id"])
    .merge(state);
  return { ok: true };
};

const draftToRow = (
  appId: string,
  input: ReturnType<typeof communicationDraftSchema.parse>
) => ({
  app_id: appId,
  channel: input.kind === "email" ? "email" : "in_app",
  kind: input.kind,
  style: input.style,
  priority: input.kind === "email" ? null : input.priority,
  audience_mode: input.audienceMode,
  title: input.title || null,
  subject: input.subject || null,
  body_markdown: input.bodyMarkdown || null,
  link_url: input.linkUrl || null,
  media_url: input.mediaUrl || null,
  media_type: input.mediaType || null,
  reaction_template:
    input.kind === "notification" ? input.reactionTemplate : null,
  interaction_config:
    input.kind === "poll" || input.kind === "input"
      ? input.interactionConfig
      : {},
  available_from: input.availableFrom ? new Date(input.availableFrom) : null,
  available_until: input.availableUntil ? new Date(input.availableUntil) : null,
});

const assertAudienceUsers = async (
  trx: Knex.Transaction,
  appId: string,
  userIds: string[]
) => {
  if (userIds.length === 0) return;
  const rows = await trx("auth.users")
    .select("id")
    .where("app_id", appId)
    .whereIn("id", userIds);
  if (rows.length !== new Set(userIds).size) {
    throw new Error("Audience contains a user outside this app.");
  }
};

export const createCommunication = async (
  appId: string,
  creatorId: string,
  raw: unknown
) => {
  const input = communicationDraftSchema.parse(raw);
  const db = getDB();
  const id = randomUUID();
  await db.transaction(async (trx) => {
    await assertAudienceUsers(trx, appId, input.audienceUserIds);
    await trx(TABLE).insert({
      id,
      ...draftToRow(appId, input),
      created_by: creatorId,
    });
    if (input.audienceMode !== "everyone") {
      await trx(AUDIENCE).insert(
        input.audienceUserIds.map((userId) => ({
          app_id: appId,
          communication_id: id,
          user_id: userId,
        }))
      );
    }
  });
  return getCommunicationDetails(appId, id);
};

export const updateCommunication = async (
  appId: string,
  id: string,
  raw: unknown
) => {
  const input = communicationDraftSchema.parse(raw);
  const db = getDB();
  await db.transaction(async (trx) => {
    const current = (await trx(TABLE)
      .where({ app_id: appId, id })
      .forUpdate()
      .first()) as DbCommunication | undefined;
    if (!current) throw new Error("Communication not found.");
    if (current.published_at) throw new Error("Published communications are immutable.");
    if (current.kind !== input.kind) throw new Error("Communication kind is immutable.");
    await assertAudienceUsers(trx, appId, input.audienceUserIds);
    await trx(TABLE)
      .where({ app_id: appId, id })
      .update({ ...draftToRow(appId, input), updated_at: trx.fn.now() });
    await trx(AUDIENCE).where({ app_id: appId, communication_id: id }).del();
    if (input.audienceMode !== "everyone") {
      await trx(AUDIENCE).insert(
        input.audienceUserIds.map((userId) => ({
          app_id: appId,
          communication_id: id,
          user_id: userId,
        }))
      );
    }
  });
  return getCommunicationDetails(appId, id);
};

export const transitionCommunication = async (
  appId: string,
  id: string,
  action: "publish" | "abort"
) => {
  const db = getDB();
  const current = (await db(TABLE)
    .where({ app_id: appId, id })
    .first()) as DbCommunication | undefined;
  if (!current) throw new Error("Communication not found.");
  if (action === "publish") {
    if (current.published_at) throw new Error("Communication is already published.");
    await db(TABLE).where({ app_id: appId, id }).update({
      published_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
  } else {
    if (!current.published_at || current.aborted_at) {
      throw new Error("Only a live published communication can be aborted.");
    }
    await db(TABLE).where({ app_id: appId, id }).update({
      aborted_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
  }
  return getCommunicationDetails(appId, id);
};

export const listAdminCommunications = async (appId: string) => {
  const rows = await getDB()(TABLE)
    .where({ app_id: appId })
    .orderBy("created_at", "desc")
    .limit(100);
  return rows.map(serializeCommunication);
};

export const getCommunicationDetails = async (appId: string, id: string) => {
  const db = getDB();
  const row = await db(TABLE + " as c")
    .leftJoin("auth.users as creator", function joinCreator() {
      this.on("creator.id", "=", "c.created_by").andOn("creator.app_id", "=", "c.app_id");
    })
    .select("c.*", db.raw("COALESCE(creator.name, creator.username, creator.email) AS creator_name"))
    .where({ "c.app_id": appId, "c.id": id })
    .first();
  if (!row) throw new Error("Communication not found.");
  const [audienceUsers, eligibleCountRow, displayRows, responseRows] =
    await Promise.all([
      db(AUDIENCE + " as ca")
        .join("auth.users as u", function joinUser() {
          this.on("u.app_id", "=", "ca.app_id").andOn("u.id", "=", "ca.user_id");
        })
        .select("u.id", "u.name", "u.username", "u.email")
        .where({ "ca.app_id": appId, "ca.communication_id": id }),
      row.audience_mode === "whitelist"
        ? db(AUDIENCE).count({ count: "*" }).where({ app_id: appId, communication_id: id }).first()
        : row.audience_mode === "blacklist"
          ? db("auth.users as u")
              .where("u.app_id", appId)
              .whereNotExists(
                db(AUDIENCE + " as ca")
                  .select(1)
                  .whereRaw("ca.app_id = u.app_id")
                  .whereRaw("ca.user_id = u.id")
                  .where("ca.communication_id", id)
              )
              .count({ count: "*" })
              .first()
          : db("auth.users").count({ count: "*" }).where("app_id", appId).first(),
      db(DISPLAYS + " as d")
        .join("auth.users as u", function joinUser() {
          this.on("u.app_id", "=", "d.app_id").andOn("u.id", "=", "d.user_id");
        })
        .select("d.user_id as userId", "u.name", "u.username", "u.email")
        .min("d.displayed_at as firstDisplayedAt")
        .max("d.displayed_at as lastDisplayedAt")
        .count("* as displayCount")
        .where({ "d.app_id": appId, "d.communication_id": id })
        .groupBy("d.user_id", "u.name", "u.username", "u.email")
        .orderBy("lastDisplayedAt", "desc")
        .limit(100),
      db(STATE + " as s")
        .join("auth.users as u", function joinUser() {
          this.on("u.app_id", "=", "s.app_id").andOn("u.id", "=", "s.user_id");
        })
        .select("s.user_id as userId", "u.name", "u.username", "u.email", "s.reaction", "s.response", "s.skipped", "s.responded_at as respondedAt")
        .where({ "s.app_id": appId, "s.communication_id": id })
        .whereNotNull("s.responded_at")
        .orderBy("s.responded_at", "desc")
        .limit(100),
    ]);
  return {
    communication: serializeCommunication(row),
    audienceUsers,
    metrics: {
      eligible: Number(eligibleCountRow?.count || 0),
      displayed: displayRows.length,
      responded: responseRows.length,
    },
    displays: displayRows,
    responses: responseRows,
  };
};

export const searchAudienceUsers = async (appId: string, search: string) => {
  const db = getDB();
  const term = `%${search.trim().replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  return db("auth.users")
    .select("id", "name", "username", "email")
    .where("app_id", appId)
    .andWhere((query) =>
      query
        .whereILike("name", term)
        .orWhereILike("username", term)
        .orWhereILike("email", term)
    )
    .orderByRaw("lower(coalesce(name, username, email)) asc")
    .limit(20);
};

export const deleteCommunication = async (
  appId: string,
  id: string,
  confirmationTitle: string | null
) => {
  const db = getDB();
  const row = await db(TABLE).where({ app_id: appId, id }).first();
  if (!row) throw new Error("Communication not found.");
  const collected = await db(STATE)
    .where({ app_id: appId, communication_id: id })
    .where((query) => query.whereNotNull("first_displayed_at").orWhereNotNull("responded_at"))
    .first();
  const confirmationLabel = row.title || row.subject || "";
  if (collected && confirmationTitle !== confirmationLabel) {
    throw new Error("Type the exact title to delete collected user data.");
  }
  await db(TABLE).where({ app_id: appId, id }).del();
};
