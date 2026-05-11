import "server-only";

import { getAppID } from "@/42go/config/app-config";
import { getDB } from "@/42go/db";
import type {
  TEventJson,
  TEventRowInput,
  TRecordEventBatchInput,
  TRecordEventInput,
} from "@/42go/events/types";
import {
  EVENT_BATCH_MAX_SIZE,
  assertPayloadSize,
  normalizeEventAt,
  normalizeEventObject,
  validateEventName,
} from "@/42go/events/validation";

const resolveTrustedAppId = async (appId?: string | null) => {
  if (appId) return appId;
  const resolved = await getAppID();
  if (!resolved) throw new Error("Cannot record event without app ID.");
  return resolved;
};

const normalizeUserId = (userId: unknown) => {
  if (typeof userId !== "string" || !userId.trim()) {
    throw new Error("Cannot record event without user ID.");
  }
  return userId.trim();
};

const normalizeRecordInput = async ({
  appId,
  userId,
  name,
  eventAt,
  data,
  meta,
}: TRecordEventInput): Promise<TEventRowInput> => {
  const normalizedData = normalizeEventObject(data);
  const normalizedMeta = normalizeEventObject(meta);
  assertPayloadSize(normalizedData);
  assertPayloadSize(normalizedMeta);

  return {
    app_id: await resolveTrustedAppId(appId),
    user_id: normalizeUserId(userId),
    event_at: normalizeEventAt(eventAt),
    name: validateEventName(name),
    data: normalizedData,
    meta: normalizedMeta,
  };
};

export const recordEvent = async (input: TRecordEventInput) => {
  const db = input.db || getDB();
  const row = await normalizeRecordInput(input);

  await db.raw("SELECT events.events_prepare_partitions()");
  await db("events.events").insert(row);

  return row;
};

export const recordEvents = async ({
  appId,
  userId,
  events,
  meta = {},
  db = getDB(),
}: TRecordEventBatchInput) => {
  if (events.length === 0) return [];
  if (events.length > EVENT_BATCH_MAX_SIZE) {
    throw new Error(`Event batch cannot contain more than ${EVENT_BATCH_MAX_SIZE} events.`);
  }

  const trustedAppId = await resolveTrustedAppId(appId);
  const trustedUserId = normalizeUserId(userId);
  const batchMeta = normalizeEventObject(meta);
  assertPayloadSize(batchMeta);

  const rows = await Promise.all(
    events.map((event) =>
      normalizeRecordInput({
        appId: trustedAppId,
        userId: trustedUserId,
        ...event,
        meta: {
          ...(event.meta || {}),
          ...batchMeta,
        } as TEventJson,
      })
    )
  );

  await db.raw("SELECT events.events_prepare_partitions()");
  await db("events.events").insert(rows);

  return rows;
};
